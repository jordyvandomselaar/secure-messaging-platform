import React, {useContext, useEffect, useMemo, useState} from 'react';
import {ScrollView, View, ViewProps} from 'react-native';
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
// @ts-ignore
import crypto from 'expo-standard-web-crypto';
import '@expo/match-media';
import {useMediaQuery} from "react-responsive";
import {LinearGradient} from "expo-linear-gradient";
import {BlurView} from "expo-blur";
import {
    useFonts,
    Inter_100Thin,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_900Black
} from '@expo-google-fonts/inter';

Amplify.configure(awsconfig)

const theme = {
    ...DefaultTheme,
    roundness: 5,
    colors: {
        ...DefaultTheme.colors,
        primary: '#4448ff',
        accent: '#f1c40f',
        background: '#ffffff',
        text: '#ffffff'
    },
    fonts: {
        regular: {
            fontFamily: "Inter_400Regular"
        },
        medium: {
            fontFamily: "Inter_500Medium"
        },
        light: {
            fontFamily: "Inter_300Light"
        },
        thin: {
            fontFamily: "Inter_100Thin"
        },
    }
};

const breakpoints = {
    mobile: 624
}

// @ts-ignore
const SavedMessagesContext = React.createContext<ReturnType<typeof initializeSavedMessages>>();

export default function App() {
    useFonts({
        Inter_100Thin,
        Inter_300Light,
        Inter_400Regular,
        Inter_500Medium,
        Inter_900Black
    });
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

                if (!message) {
                    return;
                }

                setMessageDetail(message);
            })
        })
    })

    return (
        <PaperProvider theme={theme}>
            <LinearGradient colors={['#7579ff', '#b224ef']} style={{flex: 1}}>
                <ScrollView style={{flex: 1}}>
                    <AppBar/>
                    <View style={{flex: 1, alignItems: 'center'}}>
                        {messageDetail ? <MessageScreen message={messageDetail}/> : <HomeScreen/>}
                    </View>
                </ScrollView>
            </LinearGradient>
        </PaperProvider>
    );
}

interface MessageScreenProps {
    message: Message
}

function MessageScreen({message}: MessageScreenProps) {
    const [password, setPassword] = useState('');
    const [decryptedMessage, setDecryptedMessage] = useState<string>();

    const decryptMessage = () => {
        if (!message.message) return;

        const result = CryptoJS.AES.decrypt(message.message, password).toString(CryptoJS.enc.Utf8);

        if (result) {
            setDecryptedMessage(result);
        }
    }

    return (
        <Page>
            <Headline style={{fontSize: 50, fontFamily: "Inter_900Black"}}>
                Decrypt your message
            </Headline>
            <View style={{paddingTop: 30}}>
                <Pane>
                    <View>
                        <TextInput label="Enter your key" value={password} onChangeText={setPassword}
                                   style={{backgroundColor: 'transparent'}}/>
                        <Button mode={"contained"} style={{width: 200, marginTop: 30}}
                                onPress={decryptMessage}>Decrypt</Button>
                    </View>
                </Pane>
            </View>
            {decryptedMessage && (
                <View style={{paddingTop: 30}}>
                    <Headline>
                        Your message
                    </Headline>
                    <View style={{paddingTop: 30}}>
                        <Pane>
                            <Text>{decryptedMessage}</Text>
                        </Pane>
                    </View>
                </View>
            )}
        </Page>
    )
}

function HomeScreen() {
    const savedMessages = initializeSavedMessages();
    const isPhone = useIsPhone();

    return (
        <SavedMessagesContext.Provider value={savedMessages}>
            <Page>
                <View style={{flexDirection: isPhone ? 'column' : 'row'}}>
                    <View style={{flex: 1, paddingRight: isPhone ? 0 : 10, minWidth: 200}}>
                        <Hero/>
                    </View>
                    <View style={{
                        alignItems: "center",
                        flex: 1,
                        paddingLeft: isPhone ? 0 : 10,
                        minWidth: 300,
                        marginTop: 30
                    }}>
                        <View style={{width: '100%'}}>
                            <Pane>
                                <NewSecureMessage/>
                            </Pane>
                        </View>
                    </View>
                </View>
                <Headline style={{marginTop: 100}}>Previously sent messages on this device</Headline>
                <View style={{paddingTop: 30}}>
                    <Pane>
                        <SecureMessagesTable messages={savedMessages.messages.reverse()}/>
                    </Pane>
                </View>
            </Page>
        </SavedMessagesContext.Provider>
    )
}

function AppBar() {
    const homeUrl = Linking.createURL('/');

    return (
        <View style={{paddingTop: 50}}>
            <Text style={{fontSize: 40, textAlign: "center"}} onPress={() => Linking.openURL(homeUrl)}>Secure Messaging
                Platform</Text>
        </View>
    );
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
        if (!message) return;

        const password = createPassword();

        const result = await addMessage(message, password);

        if (!result) return;

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

    if(lastSavedMessage) {
        return (
            <View>
                <Title>Your message was created successfully.</Title>
                <Text style={{paddingTop: 20}}>Unique link</Text>
                <TextInput
                    style={{width: '100%', backgroundColor: 'transparent'}}
                    value={lastSavedMessage.url}
                    mode={"outlined"}
                />
                <Text style={{paddingTop: 20}}>Secret password</Text>
                <TextInput
                    style={{width: '100%', backgroundColor: 'transparent'}}
                    value={lastSavedMessage.password}
                    mode={"outlined"}
                />
            </View>
        )
    }

    return (
        <View style={{padding: 10}}>
            <TextInput
                label="Your Message"
                multiline
                numberOfLines={10}
                style={{width: '100%', backgroundColor: 'transparent'}}
                value={message}
                onChangeText={setMessage}
            />
            <Button mode="contained" style={{marginTop: 30, width: 200}} onPress={saveNewMessage}>
                Encrypt Message
            </Button>
        </View>
    );
}

function Hero() {
    return (
        <View style={{paddingTop: 50}}>
            <Headline style={{fontSize: 50, fontFamily: "Inter_900Black"}}>
                Send an encrypted message
            </Headline>
            <Text style={{paddingTop: 30, fontSize: 20, fontWeight: "100"}}>
                Send any message safe and secure. Because your message is encrypted on your device, your private data
                can only be read by the intended recipient.
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
        })) as { data: CreateMessageMutation };

        const result = response.data.createMessage;
        if (!result) return;

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
    (crypto as Crypto).getRandomValues(values);

    let i;
    let result = "";
    for (i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }

    return result;
}

function useIsPhone() {
    return useMediaQuery({maxWidth: breakpoints.mobile});
}

function Page(props: ViewProps & { children: React.ReactNode }) {
    const isPhone = useIsPhone();

    return <View
        style={{
            width: '100%',
            marginTop: 80,
            paddingHorizontal: isPhone ? 5 : 50,
            paddingLeft: "10%",
            paddingRight: "10%"
        }} {...props}/>
}

interface PageProps {
    children: React.ReactNode
}

function Pane({children}: PageProps) {
    return (
        <BlurView intensity={50}>
            <Surface style={{backgroundColor: 'rgba(255,255,255,.3)', padding: 10}}>
                {children}
            </Surface>
        </BlurView>
    )
}
