import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { api, getErrorMessage } from '../api/client';
import BrandGlyph from '../components/BrandGlyph';
import Screen from '../components/Screen';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { sendChat, userMessageAdded } from '../store/slices/chatSlice';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import type { ChatMessage } from '../types';

interface AssistantOverview {
  safe: {
    safeToSpend: number;
    buffer: number;
  };
  accounts: { id: string; name: string; type: string; balance: number }[];
  suggestion: {
    goalId: string;
    goalName: string;
    amount: number;
    stillHave: number;
    fundedAfterPct: number;
  } | null;
}

interface TransferPreview {
  amount: number;
  goal: {
    name: string;
    before: number;
    after: number;
    pctBefore: number;
    pctAfter: number;
  };
  account: {
    name: string;
    before: number;
    after: number;
  } | null;
  safeToSpend: { before: number; after: number };
  warnings: { code: string; message: string }[];
}

const STARTER_QUESTION =
  'Can I save a little more this month without stretching my budget?';

function AssistantAvatar({ size = 30 }: { size?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.heroBg,
        },
      ]}
    >
      <BrandGlyph size={size * 0.62} />
    </View>
  );
}

function timeLabel(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatScreen() {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const dispatch = useAppDispatch();
  const { messages, sending, error } = useAppSelector(s => s.chat);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [overview, setOverview] = useState<AssistantOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] =
    useState<ChatMessage['card']>(null);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [bufferOpen, setBufferOpen] = useState(false);
  const [bufferValue, setBufferValue] = useState('');
  const [bufferBusy, setBufferBusy] = useState(false);
  const [bufferError, setBufferError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await api.get<AssistantOverview>('/overview');
      setOverview(data);
      setOverviewError(null);
    } catch (e) {
      setOverviewError(getErrorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview]),
  );

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setText('');
    dispatch(userMessageAdded(trimmed));
    dispatch(sendChat());
  };

  const openTransferPreview = async (card: ChatMessage['card']) => {
    if (!card || card.type !== 'save_suggestion') return;
    setTransferTarget(card);
    setPreview(null);
    setTransferError(null);
    setTransferBusy(true);
    try {
      const { data } = await api.post<TransferPreview>('/transfers/preview', {
        goalId: card.goalId,
        amount: card.amount,
      });
      setPreview(data);
    } catch (e) {
      setTransferError(getErrorMessage(e));
    } finally {
      setTransferBusy(false);
    }
  };

  const confirmTransfer = async () => {
    if (!transferTarget || !preview) return;
    setTransferBusy(true);
    setTransferError(null);
    try {
      await api.post('/transfers', {
        goalId: transferTarget.goalId,
        amount: preview.amount,
      });
      setTransferTarget(null);
      setPreview(null);
      await loadOverview();
      Alert.alert(
        'Transfer complete',
        `${money(preview.amount)} was added to ${preview.goal.name}.`,
      );
    } catch (e) {
      setTransferError(getErrorMessage(e));
    } finally {
      setTransferBusy(false);
    }
  };

  const openBufferEditor = () => {
    setBufferValue(String(overview?.safe.buffer ?? 0));
    setBufferError(null);
    setBufferOpen(true);
  };

  const saveBuffer = async () => {
    const amount = Number(bufferValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setBufferError('Enter a valid amount of zero or more.');
      return;
    }
    setBufferBusy(true);
    setBufferError(null);
    try {
      await api.patch('/auth/settings', { safetyBuffer: amount });
      setBufferOpen(false);
      await loadOverview();
    } catch (e) {
      setBufferError(getErrorMessage(e));
    } finally {
      setBufferBusy(false);
    }
  };

  const renderSuggestionCard = (card: NonNullable<ChatMessage['card']>) => {
    if (card.type !== 'save_suggestion') return null;
    return (
      <View
        style={[
          styles.suggestionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.suggestionHeading}>
          <View
            style={[
              styles.suggestionIcon,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Icon
              source="arrow-down-right"
              size={18}
              color={theme.colors.secondary}
            />
          </View>
          <View style={styles.suggestionTitle}>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              A POSSIBLE NEXT STEP
            </Text>
            <Text
              variant="titleSmall"
              style={styles.goalName}
              numberOfLines={1}
            >
              {card.goalName}
            </Text>
          </View>
        </View>
        <View style={styles.amountRow}>
          <Amount label="SAFE TO SPEND" value={money(card.safeToSpend)} />
          <Amount label="SUGGESTED" value={money(card.amount)} />
          <Amount label="LEFT AFTER" value={money(card.stillHave)} />
        </View>
        <Button
          mode="contained"
          icon="arrow-right"
          contentStyle={styles.previewButtonContent}
          style={styles.previewButton}
          onPress={() => openTransferPreview(card)}
        >
          Preview {money(card.amount)} transfer
        </Button>
        <Text
          variant="bodySmall"
          style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}
        >
          Nothing moves until you review and confirm.
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.role === 'user';
    return (
      <View style={[styles.messageBlock, mine && styles.userMessageBlock]}>
        {mine ? (
          <>
            <View
              style={[styles.userBubble, { backgroundColor: colors.heroBg }]}
            >
              <Text style={{ color: colors.onHero }}>{item.content}</Text>
            </View>
            <Text
              variant="labelSmall"
              style={[
                styles.userTime,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              YOU · {timeLabel(item.createdAt)}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.assistantIdentity}>
              <AssistantAvatar size={27} />
              <Text
                variant="labelMedium"
                style={[
                  styles.assistantName,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                MONEYSAFE AI
              </Text>
              <Text
                variant="labelSmall"
                style={[
                  styles.messageTime,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                · {timeLabel(item.createdAt)}
              </Text>
            </View>
            <View
              style={[
                styles.assistantBubble,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.assistantCopy,
                  { color: theme.colors.onSurface },
                ]}
              >
                {item.content}
              </Text>
              {item.card ? renderSuggestionCard(item.card) : null}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderWelcome = () => {
    const suggestion = overview?.suggestion;
    const intro =
      overviewError && !overview
        ? 'I could not load your account snapshot just now. You can still ask me a question.'
        : suggestion
        ? `There may be room to save ${money(suggestion.amount)} toward ${
            suggestion.goalName
          }, while keeping your bills and safety buffer in view.`
        : 'Your account snapshot is up to date. Ask me about spending, budgets, or ways to make progress on a goal.';

    return (
      <View style={styles.welcomeConversation}>
        <View style={styles.userBubble}>
          <Text style={{ color: colors.onHero }}>{STARTER_QUESTION}</Text>
        </View>
        <Text
          variant="labelSmall"
          style={[styles.userTime, { color: theme.colors.onSurfaceVariant }]}
        >
          YOU · {timeLabel()}
        </Text>
        <View style={styles.messageBlock}>
          <View style={styles.assistantIdentity}>
            <AssistantAvatar size={27} />
            <Text
              variant="labelMedium"
              style={[
                styles.assistantName,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              MONEYSAFE AI
            </Text>
            <Text
              variant="labelSmall"
              style={[
                styles.messageTime,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              · {timeLabel()}
            </Text>
          </View>
          <View
            style={[
              styles.assistantBubble,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[styles.assistantCopy, { color: theme.colors.onSurface }]}
            >
              {intro}
            </Text>
            {suggestion ? (
              renderSuggestionCard({
                type: 'save_suggestion',
                ...suggestion,
                safeToSpend: overview.safe.safeToSpend,
              })
            ) : (
              <Text
                variant="bodySmall"
                style={[
                  styles.disclaimer,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Suggestions are based on your available balance, upcoming bills,
                and safety buffer.
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <AssistantAvatar size={42} />
            <View style={styles.headerCopy}>
              <Text
                variant="labelSmall"
                style={[styles.eyebrow, { color: colors.accent }]}
              >
                MONEYSAFE · YOUR ASSISTANT
              </Text>
              <Text variant="headlineSmall" style={styles.title}>
                A clearer next step.
              </Text>
            </View>
          </View>
          <Text
            variant="bodySmall"
            style={[
              styles.accountStatus,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {overview
              ? `Using ${overview.accounts.length} ${
                  overview.accounts.length === 1 ? 'account' : 'accounts'
                } · updated just now`
              : overviewError
              ? 'Account snapshot unavailable'
              : 'Checking your accounts…'}
          </Text>
        </View>

        <FlatList
          style={styles.messageList}
          data={messages}
          keyExtractor={(item, index) =>
            `${item.role}-${item.createdAt ?? index}`
          }
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            messages.length > 0 &&
            listRef.current?.scrollToEnd({ animated: true })
          }
          ref={listRef}
          renderItem={renderMessage}
          ListEmptyComponent={renderWelcome}
          ListFooterComponent={
            <>
              {sending && (
                <View style={styles.typingRow}>
                  <AssistantAvatar size={27} />
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              )}
              {error ? (
                <Text variant="bodySmall" style={styles.errorText}>
                  {error}
                </Text>
              ) : null}
            </>
          }
        />

        <View style={styles.quickQuestions}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickQuestionsContent}
          >
            <Pressable
              accessibilityRole="button"
              disabled={sending}
              onPress={() => send('How did you calculate this?')}
              style={[
                styles.quickChip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Icon
                source="help-circle-outline"
                size={16}
                color={colors.accent}
              />
              <Text
                variant="labelMedium"
                style={[
                  styles.quickChipText,
                  { color: theme.colors.onSurface },
                ]}
              >
                How did you calculate this?
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openBufferEditor}
              style={[
                styles.quickChip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Icon source="tune-variant" size={16} color={colors.accent} />
              <Text
                variant="labelMedium"
                style={[
                  styles.quickChipText,
                  { color: theme.colors.onSurface },
                ]}
              >
                Adjust my buffer
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <TextInput
            mode="flat"
            placeholder="Ask about your money…"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={styles.input}
            dense
          />
          <IconButton
            icon="arrow-up"
            mode="contained"
            size={20}
            accessibilityLabel="Send message"
            containerColor={colors.heroBg}
            iconColor={colors.onHero}
            disabled={!text.trim() || sending}
            onPress={() => send(text)}
          />
        </View>
        <Text variant="labelSmall" style={styles.footerNote}>
          MoneySafe offers guidance, not financial advice.
        </Text>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog
          visible={!!transferTarget}
          onDismiss={() => {
            if (!transferBusy) {
              setTransferTarget(null);
              setPreview(null);
            }
          }}
        >
          <Dialog.Title>Review this transfer</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            {transferBusy && !preview ? (
              <ActivityIndicator color={colors.accent} />
            ) : preview ? (
              <View style={styles.previewDetails}>
                <Text variant="titleMedium">
                  {money(preview.amount)} to {preview.goal.name}
                </Text>
                {preview.account ? (
                  <Text variant="bodyMedium">
                    {preview.account.name}: {money(preview.account.before)} →{' '}
                    {money(preview.account.after)}
                  </Text>
                ) : null}
                <Text variant="bodyMedium">
                  Safe to spend: {money(preview.safeToSpend.before)} →{' '}
                  {money(preview.safeToSpend.after)}
                </Text>
                {preview.warnings.map(warning => (
                  <Text
                    key={warning.code}
                    style={{ color: theme.colors.error }}
                  >
                    {warning.message}
                  </Text>
                ))}
                <Text variant="bodySmall" style={styles.disclaimer}>
                  This moves real money from your account. Confirm only if these
                  amounts look right.
                </Text>
              </View>
            ) : null}
            {transferError ? (
              <Text style={[styles.actionError, { color: theme.colors.error }]}>
                {transferError}
              </Text>
            ) : null}
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              disabled={transferBusy}
              onPress={() => {
                setTransferTarget(null);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!preview || transferBusy}
              loading={transferBusy && !!preview}
              onPress={() => confirmTransfer()}
            >
              Confirm transfer
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={bufferOpen}
          onDismiss={() => !bufferBusy && setBufferOpen(false)}
        >
          <Dialog.Title>Adjust your safety buffer</Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodyMedium"
              style={[
                styles.bufferDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              MoneySafe keeps this amount aside when calculating what is safe to
              spend.
            </Text>
            <TextInput
              mode="outlined"
              label="Safety buffer"
              value={bufferValue}
              onChangeText={setBufferValue}
              keyboardType="decimal-pad"
            />
            {bufferError ? (
              <Text style={[styles.actionError, { color: theme.colors.error }]}>
                {bufferError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={bufferBusy} onPress={() => setBufferOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={bufferBusy}
              disabled={bufferBusy}
              onPress={() => saveBuffer()}
            >
              Save buffer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.amount}>
      <Text
        variant="labelSmall"
        style={[styles.amountLabel, { color: theme.colors.onSurfaceVariant }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        variant="titleSmall"
        numberOfLines={1}
        style={{ color: theme.colors.onSurface }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  keyboard: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { marginLeft: 12, flex: 1 },
  eyebrow: { color: '#21836B', letterSpacing: 1.1, fontWeight: '700' },
  title: { fontWeight: '700', marginTop: 2 },
  accountStatus: { marginTop: 10, marginLeft: 54 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  messageList: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    flexGrow: 1,
  },
  welcomeConversation: { paddingTop: 4 },
  messageBlock: {
    width: '100%',
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  userMessageBlock: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '88%',
    alignSelf: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    backgroundColor: '#102A24',
  },
  userTime: {
    color: '#839088',
    marginTop: 6,
    marginBottom: 14,
    marginRight: 2,
    letterSpacing: 0.5,
  },
  assistantIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistantName: { color: '#52665C', letterSpacing: 0.8, fontWeight: '700' },
  messageTime: { color: '#839088', marginLeft: 5 },
  assistantBubble: {
    width: '100%',
    padding: 14,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1,
  },
  assistantCopy: { lineHeight: 22, color: '#18312B' },
  suggestionCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginTop: 14,
  },
  suggestionHeading: { flexDirection: 'row', alignItems: 'center' },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTitle: { marginLeft: 9, flex: 1 },
  goalName: { marginTop: 2, fontWeight: '700' },
  amountRow: { flexDirection: 'row', marginTop: 16, marginBottom: 14 },
  amount: { flex: 1, minWidth: 0 },
  amountLabel: {
    color: '#65746D',
    fontSize: 9,
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  previewButton: { borderRadius: 12 },
  previewButtonContent: { minHeight: 44 },
  disclaimer: { color: '#77847C', lineHeight: 17, marginTop: 9 },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  errorText: { color: '#B44837', marginBottom: 10 },
  quickQuestions: { paddingBottom: 8 },
  quickQuestionsContent: { paddingHorizontal: 16, gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  quickChipText: { color: '#18312B' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    marginHorizontal: 16,
    paddingLeft: 8,
    paddingRight: 4,
    minHeight: 54,
  },
  input: { flex: 1, backgroundColor: 'transparent', maxHeight: 120 },
  footerNote: { color: '#839088', textAlign: 'center', paddingVertical: 8 },
  dialogScroll: { maxHeight: 360 },
  previewDetails: { gap: 12, paddingVertical: 8 },
  bufferDescription: { marginBottom: 14, color: '#65746D' },
  actionError: { marginTop: 8 },
});
