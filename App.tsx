import React, {useContext, useEffect, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import Amplify, {API, graphqlOperation} from 'aws-amplify'
import awsconfig from './aws-exports'
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from "crypto-js";
import {
    Appbar,
    Button,
    DataTable,
    DefaultTheme, Headline,
    Provider as PaperProvider,
    Surface,
    TextInput, Title,
    Text
} from "react-native-paper"
import {createMessage} from "./src/graphql/mutations";
import {CreateMessageMutation, GetMessageQuery, Message} from "./src/API";
import * as Linking from 'expo-linking';
import {getMessage} from "./src/graphql/queries";
import crypto from 'expo-standard-web-crypto';

Amplify.configure(awsconfig)

const theme = {
    ...DefaultTheme,
    roundness: 2,
    colors: {
        ...DefaultTheme.colors,
        primary: '#3498db',
        accent: '#f1c40f',
        background: '#ffffff'
    },
};

const SavedMessagesContext = React.createContext<undefined|ReturnType<typeof initializeSavedMessages>>(undefined);

export default function App() {
    const [messageDetail, setMessageDetail] = useState<Message>();

    useEffect(() => {
        Linking.getInitialURL().then(url => {
            if (!url) return;

            const id = Linking.parse(url).queryParams.id;

            if (!id) return;

            (API.graphql(graphqlOperation(getMessage, {
                id
            })) as Promise<{ data: GetMessageQuery }>).then(response => {
                const message = response.data.getMessage;

                if(!message) {
                    return;
                }

                setMessageDetail(message);
            })
        })
    })

    return (
        <PaperProvider theme={theme}>
            <ScrollView style={{flex: 1}}>
                <AppBar/>
                <View style={{flex: 1, alignItems: 'center'}}>
                    {messageDetail ? <MessageScreen message={messageDetail}/> : <HomeScreen/>}
                </View>
            </ScrollView>
        </PaperProvider>
    );
}

interface MessageScreenProps {
    message: Message
}

function MessageScreen ({message}: MessageScreenProps) {
    const [password, setPassword] = useState('');
    const [decryptedMessage, setDecryptedMessage] = useState<string>();

    const decryptMessage = () => {
        if(!message.message) return;

        const result = CryptoJS.AES.decrypt(message.message, password).toString(CryptoJS.enc.Utf8);

        if(result) {
            setDecryptedMessage(result);
        }
    }

    return (
        <View style={{width: '80%', marginTop: 20}}>
            <Headline>Decrypt a message</Headline>
            <TextInput label="Enter your key" value={password} onChangeText={setPassword}/>
            <Button mode={"contained"} style={{width: 200}} onPress={decryptMessage}>Decrypt</Button>
            <Text style={{marginTop: 20}}>{decryptedMessage}</Text>
        </View>
    )
}

function HomeScreen() {
    const savedMessages = initializeSavedMessages();

    return (
       <SavedMessagesContext.Provider value={savedMessages}>
           <View style={{width: '80%', marginTop: 20}}>
               <View style={{flexDirection: 'row', flexWrap: "wrap"}}>
                   <View style={{flex: 1, paddingRight: 10, minWidth: 200}}>
                       <Hero/>
                   </View>
                   <View style={{alignItems: "center", flex: 1, paddingLeft: 10, minWidth: 300}}>
                       <View style={{width: '100%'}}>
                           <Surface>
                               <NewSecureMessage/>
                           </Surface>
                       </View>
                   </View>
               </View>
               <Title style={{marginTop: 20}}>Previously sent messages on this device</Title>
               <Surface style={{marginTop: 20}}>
                   <SecureMessagesTable messages={savedMessages.messages.reverse()}/>
               </Surface>
           </View>
       </SavedMessagesContext.Provider>
    )
}

function AppBar() {
    const homeUrl = Linking.createURL('/');

    return (
        <Appbar style={{backgroundColor: '#FFF'}}>
            <Appbar.Content onPress={() => Linking.openURL(homeUrl)} title="Secure Messaging Platform" titleStyle={{textAlign: 'center'}}/>
        </Appbar>
    )
}

interface SecureMessagesTableProps {
    messages: Message[]
}

function SecureMessagesTable({messages}: SecureMessagesTableProps) {
    return (
        <DataTable>
            {messages.map(message => (
                <DataTable.Row key={message.id}>
                    <DataTable.Cell>{message.id}</DataTable.Cell>
                </DataTable.Row>
            ))}
        </DataTable>
    )
}

function NewSecureMessage() {
    const {addMessage} = useSavedMessages();
    const [message, setMessage] = useState('');
    const [lastSavedMessage, setLastSavedMessage] = useState<{
        url: string;
        password: string;
    }>();

    const saveNewMessage = async () => {
        const password = createPassword();

        const result = await addMessage(message, password);

        if(!result) return;

        setLastSavedMessage({
            url: Linking.createURL('/', {
                queryParams: {
                    id: result.id
                }
            }),
            password
        });

        setMessage("");
    }

    return (
        <View style={{padding: 20, alignItems: 'flex-end'}}>
            <TextInput
                label="Your Message"
                multiline
                numberOfLines={10}
                style={{width: '100%'}}
                value={message}
                onChangeText={setMessage}
            />
            <Button mode="contained" style={{marginTop: 20, width: 200}} onPress={saveNewMessage}>
                Encrypt Message
            </Button>
            {lastSavedMessage && (
                <View style={{marginTop: 20}}>
                    <Text>Your message was created successfully.</Text>
                    <Text style={{color: 'skyblue'}} onPress={() => Linking.openURL(lastSavedMessage.url)}>Link: {lastSavedMessage.url}</Text>
                    <Text>Password: {lastSavedMessage.password}</Text>
                </View>
            )}
        </View>
    );
}

function Hero() {
    return (
        <View>
            <Headline>
                Send an encrypted message.
            </Headline>
            <Text>
                Using our tool, you can send any message safe and secure.
            </Text>
        </View>
    )
}

function initializeSavedMessages() {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        AsyncStorage.getItem('savedMessages').then(savedMessagesInStorage => {
            if (savedMessagesInStorage) {
                setMessages(JSON.parse(savedMessagesInStorage));
            }
        })
    }, [])

    const addMessage = async (message: string, password: string) => {
        const savedMessagesInStorage = await AsyncStorage.getItem('savedMessages');
        const savedMessages = savedMessagesInStorage ? JSON.parse(savedMessagesInStorage) : [];

        const response = await API.graphql(graphqlOperation(createMessage, {
            input: {
                message: CryptoJS.AES.encrypt(message, password).toString(),
            }
        })) as {data: CreateMessageMutation};

        const result = response.data.createMessage;
        if(!result) return;

        const newMessages: Message[] = [
            ...savedMessages,
            {
                message,
                id: result.id
            }
        ]

        await AsyncStorage.setItem("savedMessages", JSON.stringify(newMessages));

        setMessages(newMessages);

        return result;
    }

    return useMemo(() => ({
        messages,
        addMessage
    }), [messages, addMessage]);
}

function useSavedMessages() {
    return useContext(SavedMessagesContext);
}

function createPassword() {
   return randomString(32);
}

// https://stackblitz.com/edit/random-string
function randomString(length: number): string {
    const charset = "ABCDEFabcdef0123456789";
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);

    let i;
    let result = "";
    for (i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }

    return result;
}
