import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  Icon,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import Screen from '../components/Screen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendChat, userMessageAdded } from '../store/slices/chatSlice';
import { useColors } from '../theme/useColors';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Which category costs me the most?',
  'Am I on track with my budgets?',
  'What was my biggest expense?',
];

function AssistantAvatar() {
  const colors = useColors();
  return (
    <View style={[styles.avatar, { backgroundColor: colors.heroBg }]}>
      <Icon source="creation" size={14} color={colors.accent} />
    </View>
  );
}

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

  const showSuggestions = messages.length === 1;

  return (
    <Screen
      title="AI Assistant"
      right={
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Ask about your spending
        </Text>
      }
    >
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
            if (mine) {
              return (
                <View
                  style={[
                    styles.bubble,
                    styles.mine,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={{ color: theme.colors.onPrimary }}>
                    {item.content}
                  </Text>
                </View>
              );
            }
            return (
              <View style={styles.assistantRow}>
                <AssistantAvatar />
                <View
                  style={[
                    styles.bubble,
                    styles.theirs,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <>
              {sending && (
                <View style={styles.assistantRow}>
                  <AssistantAvatar />
                  <View
                    style={[
                      styles.bubble,
                      styles.theirs,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        letterSpacing: 3,
                      }}
                    >
                      •••
                    </Text>
                  </View>
                </View>
              )}
              {error && (
                <Text
                  style={{
                    color: theme.colors.error,
                    marginTop: 4,
                    marginLeft: 4,
                  }}
                >
                  {error}
                </Text>
              )}
              {showSuggestions && (
                <View style={{ marginTop: 18 }}>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginBottom: 4,
                    }}
                  >
                    Try asking
                  </Text>
                  {SUGGESTIONS.map(s => (
                    <Pressable
                      key={s}
                      accessibilityRole="button"
                      onPress={() => send(s)}
                      style={[
                        styles.suggestion,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Icon
                        source="lightbulb-outline"
                        size={18}
                        color={theme.colors.secondary}
                      />
                      <Text
                        variant="bodyMedium"
                        style={{ marginLeft: 10, flex: 1 }}
                      >
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            mode="outlined"
            placeholder="Ask about your spending"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            outlineStyle={{ borderRadius: 24 }}
            style={styles.input}
            dense
          />
          <IconButton
            icon="send"
            mode="contained"
            size={20}
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
  list: { padding: 16, paddingBottom: 8 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    maxWidth: '88%',
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 18,
    flexShrink: 1,
  },
  mine: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    maxWidth: '80%',
    borderBottomRightRadius: 6,
  },
  theirs: { borderBottomLeftRadius: 6 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  input: { flex: 1 },
});
