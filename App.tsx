import {StatusBar} from 'expo-status-bar';
import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {
    Appbar,
    Button,
    DataTable,
    DefaultTheme, Headline,
    Provider as PaperProvider,
    Surface,
    TextInput, Title
} from "react-native-paper"

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
    return (
        <PaperProvider theme={theme}>
            <StatusBar style="auto"/>
            <View style={{flex: 1}}>
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
                        <SecureMessagesTable/>
                    </Surface>
                </View>
            </View>
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

function SecureMessagesTable() {
    return (
        <DataTable>
            <DataTable.Row>
                <DataTable.Cell>Frozen yogurt</DataTable.Cell>
                <DataTable.Cell numeric>159</DataTable.Cell>
                <DataTable.Cell numeric>6.0</DataTable.Cell>
            </DataTable.Row>

            <DataTable.Row>
                <DataTable.Cell>Ice cream sandwich</DataTable.Cell>
                <DataTable.Cell numeric>237</DataTable.Cell>
                <DataTable.Cell numeric>8.0</DataTable.Cell>
            </DataTable.Row>
        </DataTable>
    )
}

function NewSecureMessage() {
    return (
        <View style={{padding: 20, alignItems: 'flex-end'}}>
            <TextInput
                label="Your Message"
                onChangeText={console.log}
                multiline
                numberOfLines={10}
                style={{width: '100%'}}
            />
            <TextInput
                label="Enter your e-mail if you'd like to be notified if your message has been opened"
                onChangeText={console.log}
                style={{width: '100%', marginTop: 20}}
                textContentType={"emailAddress"}
            />
            <Button mode="contained" style={{marginTop: 20, width: 200}}>
                Encrypt Message
            </Button>
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
