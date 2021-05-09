import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import Amplify, {API, graphqlOperation} from 'aws-amplify'
import awsconfig from './aws-exports'
import {v4 as uuidV4} from "uuid";
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from "crypto-js";
import {randomBytes} from "crypto"
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
import {Message} from "./src/API";

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

export default function App() {
    const {messages} = useSavedMessages();

    return (
        <PaperProvider theme={theme}>
            <ScrollView style={{flex: 1}}>
                <AppBar/>
                <View style={{flex: 1, alignItems: 'center'}}>
                    <View style={{flexDirection: 'row', marginTop: 20, width: '80%', flexWrap: "wrap"}}>
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
                    <Surface style={{marginTop: 20, width: '80%'}}>
                        <SecureMessagesTable messages={messages}/>
                    </Surface>
                </View>
            </ScrollView>
        </PaperProvider>
    );
}

function AppBar() {
    return (
        <Appbar style={{backgroundColor: '#FFF'}}>
            <Appbar.Content title="Secure Messaging Platform" titleStyle={{textAlign: 'center'}}/>
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
                <DataTable.Row>
                    <DataTable.Cell>{message.uuid}</DataTable.Cell>
                </DataTable.Row>
            ))}
        </DataTable>
    )
}

interface NewSecureMessageProps {
    onSubmit(message: string): void
}

function NewSecureMessage({onSubmit}: NewSecureMessageProps) {
    const {addMessage} = useSavedMessages();
    const [message, setMessage] = useState('');
    const [lastSavedMessage, setLastSavedMessage] = useState<{
        url: string;
        password: string;
    }>();

    const saveNewMessage = async () => {
        const password = createPassword();

        await addMessage(message, password);

        setLastSavedMessage({
            url: "https://google.com",
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
                    <Text>Link: {lastSavedMessage.url}</Text>
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

function useSavedMessages() {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        AsyncStorage.getItem('savedMessages').then(savedMessagesInStorage => {
            if (savedMessagesInStorage) {
                setMessages(JSON.parse(savedMessagesInStorage));
            }
        })
    }, [])

    const addMessage = async (message: string, password: string) => {
        const uuid = uuidV4();

        const savedMessagesInStorage = await AsyncStorage.getItem('savedMessages');
        const savedMessages = savedMessagesInStorage ? JSON.parse(savedMessagesInStorage) : [];

        await API.graphql(graphqlOperation(createMessage, {
            input: {
                uuid,
                message: CryptoJS.AES.encrypt(message, password).toString(),
            }
        }));

        const newMessages: Message[] = [
            ...savedMessages,
            {
                message,
                uuid
            }
        ]

        await AsyncStorage.setItem("savedMessages", JSON.stringify(newMessages));

        setMessages(newMessages);
    }

    return useMemo(() => ({
        messages,
        addMessage
    }), [messages, addMessage]);
}

function createPassword() {
    return randomBytes(32).toString('hex');
}
