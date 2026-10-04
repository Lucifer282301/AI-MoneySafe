import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Chip,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import Screen from '../components/Screen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendChat, userMessageAdded } from '../store/slices/chatSlice';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Which category costs me the most?',
];

export default function ChatScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { messages, sending, error } = useAppSelector(s => s.chat);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setText('');
    dispatch(userMessageAdded(trimmed));
    dispatch(sendChat());
  };

  return (
    <Screen title="AI Chat">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View
                style={[
                  styles.bubble,
                  mine
                    ? {
                        alignSelf: 'flex-end',
                        backgroundColor: theme.colors.primary,
                      }
                    : {
                        alignSelf: 'flex-start',
                        backgroundColor: theme.colors.surfaceVariant,
                      },
                ]}
              >
                <Text
                  style={{
                    color: mine
                      ? theme.colors.onPrimary
                      : theme.colors.onSurface,
                  }}
                >
                  {item.content}
                </Text>
              </View>
            );
          }}
          ListFooterComponent={
            <>
              {sending && (
                <ActivityIndicator
                  style={{ alignSelf: 'flex-start', margin: 12 }}
                />
              )}
              {error && (
                <Text style={{ color: theme.colors.error, margin: 8 }}>
                  {error}
                </Text>
              )}
            </>
          }
        />

        {messages.length === 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <Chip
                key={s}
                icon="lightbulb-outline"
                onPress={() => send(s)}
                style={{ marginRight: 8, marginBottom: 8 }}
              >
                {s}
              </Chip>
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            mode="outlined"
            placeholder="Ask about your spending"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            style={styles.input}
            dense
          />
          <IconButton
            icon="send"
            mode="contained"
            accessibilityLabel="Send message"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            disabled={!text.trim() || sending}
            onPress={() => send(text)}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 18, marginBottom: 8 },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  input: { flex: 1 },
});
