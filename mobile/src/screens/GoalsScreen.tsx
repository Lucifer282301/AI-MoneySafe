import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Icon,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { api, getErrorMessage } from '../api/client';
import Screen from '../components/Screen';
import { useMoney } from '../utils/useMoney';

type GoalIcon =
  | 'target'
  | 'umbrella'
  | 'airplane'
  | 'laptop'
  | 'home'
  | 'car'
  | 'school'
  | 'heart'
  | 'gift';

interface Goal {
  id: string;
  name: string;
  icon: GoalIcon;
  priority: boolean;
  targetAmount: number;
  savedAmount: number;
  remaining: number;
  percent: number;
  completed: boolean;
  monthlyContribution: number;
  contributionDay: number;
  nextDueOn: string | null;
  targetDate: string | null;
}

interface GoalListResponse {
  goals: Goal[];
  totalSaved: number;
  plannedMonthly: number;
  suggestion?: unknown;
}

interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS';
  balance: number;
}

interface TransferPreview {
  amount: number;
  goal: {
    id: string;
    name: string;
    before: number;
    after: number;
    pctBefore: number;
    pctAfter: number;
  };
  account: {
    id: string;
    name: string;
    before: number;
    after: number;
  } | null;
  safeToSpend: { before: number; after: number };
  warnings: { code: string; message: string }[];
}

const GOAL_ICONS: GoalIcon[] = [
  'target',
  'umbrella',
  'airplane',
  'home',
  'car',
  'school',
  'heart',
  'gift',
];

function dateLabel(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function GoalsScreen() {
  const theme = useTheme();
  const money = useMoney();
  const dark = theme.dark;
  const palette = {
    background: dark ? '#0D1A14' : '#F5F4ED',
    surface: dark ? '#17271F' : '#FFFEFA',
    surfaceAlt: dark ? '#20352A' : '#EDF2E9',
    border: dark ? '#2D4437' : '#E2E8DD',
    text: dark ? '#E9F2EA' : '#19372B',
    muted: dark ? '#A8B9AC' : '#63756A',
    forest: dark ? '#193B2C' : '#183E30',
    forestText: '#F6FFF8',
    accent: dark ? '#83D39B' : '#347B51',
    accentSoft: dark ? '#244632' : '#E2F1E4',
    warningBg: dark ? '#49351C' : '#FFF2D8',
    danger: theme.colors.error,
    warningText: dark ? '#FFE3B8' : '#774700',
  };

  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [plannedMonthly, setPlannedMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Goal | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthly, setMonthly] = useState('');
  const [priority, setPriority] = useState(false);
  const [goalIcon, setGoalIcon] = useState<GoalIcon>('target');
  const [formError, setFormError] = useState<string | null>(null);

  const [contributing, setContributing] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [returnAccountId, setReturnAccountId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [goalResponse, accountResponse] = await Promise.all([
        api.get<GoalListResponse>('/goals'),
        api.get<Account[]>('/accounts'),
      ]);
      setGoals(goalResponse.data.goals);
      setTotalSaved(goalResponse.data.totalSaved);
      setPlannedMonthly(goalResponse.data.plannedMonthly);
      setAccounts(accountResponse.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openForm = (goal?: Goal) => {
    setEditing(goal ?? null);
    setName(goal?.name ?? '');
    setTarget(goal ? String(goal.targetAmount) : '');
    setMonthly(
      goal?.monthlyContribution ? String(goal.monthlyContribution) : '',
    );
    setPriority(goal?.priority ?? goals.length === 0);
    setGoalIcon(goal?.icon ?? 'target');
    setFormError(null);
    setFormVisible(true);
  };

  const saveGoal = async () => {
    const cleanName = name.trim();
    const targetAmount = Number(target);
    const monthlyContribution = monthly.trim() ? Number(monthly) : 0;
    if (!cleanName || cleanName.length > 40) {
      setFormError('Enter a goal name (up to 40 characters).');
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setFormError('Enter a target amount greater than zero.');
      return;
    }
    if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) {
      setFormError('Enter a valid monthly plan amount.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: cleanName,
        targetAmount,
        monthlyContribution,
        priority,
        icon: goalIcon,
      };
      if (editing) await api.patch(`/goals/${editing.id}`, body);
      else await api.post('/goals', { ...body, contributionDay: 15 });
      setFormVisible(false);
      await load(true);
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const openContribution = (goal: Goal) => {
    const defaultAccount =
      accounts.find(account => account.type === 'CHECKING') ?? accounts[0];
    setContributing(goal);
    setContributionAmount('');
    setAccountId(defaultAccount?.id ?? null);
    setPreview(null);
    setActionError(null);
  };

  const reviewContribution = async () => {
    if (!contributing) return;
    const amount = Number(contributionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Enter an amount greater than zero.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const { data } = await api.post<TransferPreview>('/transfers/preview', {
        goalId: contributing.id,
        amount,
        ...(accountId ? { accountId } : {}),
      });
      setPreview(data);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmContribution = async () => {
    if (!contributing || !preview) return;
    setSaving(true);
    setActionError(null);
    try {
      await api.post('/transfers', {
        goalId: contributing.id,
        amount: preview.amount,
        ...(accountId ? { accountId } : {}),
      });
      setContributing(null);
      setPreview(null);
      await load(true);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async () => {
    if (!deleting) return;
    setSaving(true);
    setActionError(null);
    try {
      await api.delete(`/goals/${deleting.id}`, {
        params: returnAccountId
          ? { returnToAccountId: returnAccountId }
          : undefined,
      });
      setDeleting(null);
      setReturnAccountId(null);
      await load(true);
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Goals"
      style={{ backgroundColor: palette.background }}
      right={
        <Pressable
          onPress={() => openForm()}
          accessibilityRole="button"
          accessibilityLabel="Create a savings goal"
          style={[styles.addButton, { backgroundColor: palette.accent }]}
        >
          <Icon source="plus" size={20} color={dark ? '#0D2115' : '#FFFFFF'} />
        </Pressable>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={palette.accent}
          />
        }
      >
        <View style={[styles.summary, { backgroundColor: palette.forest }]}>
          <View style={styles.summaryOrb} />
          <Text style={styles.heroEyebrow}>YOUR SAVINGS, WITH PURPOSE</Text>
          <Text style={styles.heroAmount}>{money(totalSaved)}</Text>
          <Text style={styles.heroCaption}>
            saved across {goals.length} goals
          </Text>
          <View style={styles.heroDivider} />
          <View style={styles.summaryFoot}>
            <View>
              <Text style={styles.heroSmallLabel}>Monthly plan</Text>
              <Text style={styles.heroSmallValue}>{money(plannedMonthly)}</Text>
            </View>
            <View style={styles.planTag}>
              <Icon source="calendar-month-outline" size={15} color="#C2EBD0" />
              <Text style={styles.planTagText}>Manual transfers</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Your goals
            </Text>
            <Text style={[styles.sectionHint, { color: palette.muted }]}>
              Small steps add up to meaningful progress.
            </Text>
          </View>
          {goals.length > 0 && (
            <Text style={[styles.count, { color: palette.muted }]}>
              {goals.length}/20
            </Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={palette.accent} style={styles.loader} />
        ) : error ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Icon
              source="cloud-alert-outline"
              size={26}
              color={palette.muted}
            />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              Goals didn’t load
            </Text>
            <Text style={[styles.emptyCopy, { color: palette.muted }]}>
              {error}
            </Text>
            <Button onPress={() => load()} textColor={palette.accent}>
              Try again
            </Button>
          </View>
        ) : goals.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: palette.accentSoft },
              ]}
            >
              <Icon source="flag-checkered" size={24} color={palette.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              Start with one thing
            </Text>
            <Text style={[styles.emptyCopy, { color: palette.muted }]}>
              Name a goal, choose a target, and track your progress here.
            </Text>
            <Button
              mode="contained"
              onPress={() => openForm()}
              buttonColor={palette.accent}
              textColor={dark ? '#102318' : '#FFFFFF'}
            >
              Create your first goal
            </Button>
          </View>
        ) : (
          goals.map(goal => {
            const due = dateLabel(goal.nextDueOn);
            return (
              <View
                key={goal.id}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                  goal.priority && { borderColor: palette.accent },
                ]}
              >
                <View style={styles.goalTop}>
                  <View
                    style={[
                      styles.goalIcon,
                      { backgroundColor: palette.accentSoft },
                    ]}
                  >
                    <Icon source={goal.icon} size={21} color={palette.accent} />
                  </View>
                  <View style={styles.goalNameBlock}>
                    <View style={styles.goalNameLine}>
                      <Text
                        numberOfLines={1}
                        style={[styles.goalName, { color: palette.text }]}
                      >
                        {goal.name}
                      </Text>
                      {goal.priority && (
                        <View
                          style={[
                            styles.priorityPill,
                            { backgroundColor: palette.accentSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              { color: palette.accent },
                            ]}
                          >
                            PRIORITY
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.goalCaption, { color: palette.muted }]}
                    >
                      {goal.completed
                        ? 'Goal reached'
                        : `${money(goal.remaining)} to go`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${goal.name}`}
                    onPress={() => openForm(goal)}
                    hitSlop={10}
                    style={styles.editButton}
                  >
                    <Icon
                      source="pencil-outline"
                      size={19}
                      color={palette.muted}
                    />
                  </Pressable>
                </View>

                <View style={styles.amountLine}>
                  <Text style={[styles.savedAmount, { color: palette.text }]}>
                    {money(goal.savedAmount)}
                  </Text>
                  <Text style={[styles.targetAmount, { color: palette.muted }]}>
                    of {money(goal.targetAmount)}
                  </Text>
                  <Text style={[styles.percent, { color: palette.accent }]}>
                    {goal.percent}%
                  </Text>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={`${goal.name} progress`}
                  accessibilityValue={{ min: 0, max: 100, now: goal.percent }}
                  style={[
                    styles.progressTrack,
                    { backgroundColor: palette.surfaceAlt },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: palette.accent,
                        width: `${Math.min(goal.percent, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.goalBottom}>
                  <View style={styles.planCaption}>
                    <Icon
                      source="calendar-arrow-right"
                      size={15}
                      color={palette.muted}
                    />
                    <Text
                      style={[styles.planCaptionText, { color: palette.muted }]}
                    >
                      {goal.monthlyContribution > 0
                        ? `${money(goal.monthlyContribution)}/mo plan${
                            due ? ` · next ${due}` : ''
                          }`
                        : 'No monthly plan'}
                    </Text>
                  </View>
                  <Pressable
                    disabled={goal.completed}
                    onPress={() => openContribution(goal)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add money to ${goal.name}`}
                    style={[
                      styles.contributeButton,
                      { backgroundColor: palette.accentSoft },
                      goal.completed && styles.disabledButton,
                    ]}
                  >
                    <Icon source="plus" size={16} color={palette.accent} />
                    <Text
                      style={[styles.contributeText, { color: palette.accent }]}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => {
                    setDeleting(goal);
                    setReturnAccountId(
                      accounts.find(a => a.type === 'CHECKING')?.id ??
                        accounts[0]?.id ??
                        null,
                    );
                    setActionError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${goal.name}`}
                  hitSlop={8}
                  style={styles.deleteLink}
                >
                  <Text style={[styles.deleteText, { color: palette.muted }]}>
                    Remove goal
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
        {goals.length >= 20 && (
          <Text style={[styles.limitNote, { color: palette.muted }]}>
            You’ve reached the 20-goal limit.
          </Text>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={formVisible}
          onDismiss={() => !saving && setFormVisible(false)}
          style={{ backgroundColor: palette.surface }}
        >
          <Dialog.Title style={{ color: palette.text }}>
            {editing ? 'Edit goal' : 'New savings goal'}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                label="Goal name"
                mode="outlined"
                value={name}
                onChangeText={setName}
                maxLength={40}
              />
              <TextInput
                label="Target amount"
                mode="outlined"
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                style={styles.field}
              />
              <TextInput
                label="Monthly plan (optional)"
                mode="outlined"
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="decimal-pad"
                style={styles.field}
              />
              <Text style={[styles.formHint, { color: palette.muted }]}>
                This is a reminder plan only. Money moves only when you confirm
                a transfer.
              </Text>
              <Text style={[styles.iconLabel, { color: palette.text }]}>
                Choose an icon
              </Text>
              <View style={styles.iconChoices}>
                {GOAL_ICONS.map(icon => (
                  <Pressable
                    key={icon}
                    onPress={() => setGoalIcon(icon)}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${icon} icon`}
                    accessibilityState={{ selected: goalIcon === icon }}
                    style={[
                      styles.iconChoice,
                      {
                        backgroundColor:
                          goalIcon === icon
                            ? palette.accentSoft
                            : palette.surfaceAlt,
                      },
                    ]}
                  >
                    <Icon
                      source={icon}
                      size={20}
                      color={goalIcon === icon ? palette.accent : palette.muted}
                    />
                  </Pressable>
                ))}
              </View>
              <View style={styles.priorityRow}>
                <View style={styles.priorityCopy}>
                  <Text style={[styles.priorityTitle, { color: palette.text }]}>
                    Make this my priority
                  </Text>
                  <Text style={[styles.formHint, { color: palette.muted }]}>
                    Only one goal can be the priority.
                  </Text>
                </View>
                <Switch
                  value={priority}
                  onValueChange={setPriority}
                  color={palette.accent}
                />
              </View>
              {formError ? (
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  {formError}
                </Text>
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button disabled={saving} onPress={() => setFormVisible(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              disabled={saving}
              onPress={() => saveGoal()}
              textColor={palette.accent}
            >
              {editing ? 'Save changes' : 'Create goal'}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={!!contributing}
          onDismiss={() => {
            if (!saving) {
              setContributing(null);
              setPreview(null);
            }
          }}
          style={{ backgroundColor: palette.surface }}
        >
          <Dialog.Title style={{ color: palette.text }}>
            {preview
              ? 'Review transfer'
              : `Add to ${contributing?.name ?? 'goal'}`}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!preview ? (
                <>
                  <TextInput
                    label="Amount"
                    mode="outlined"
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                  {accounts.length > 0 ? (
                    <>
                      <Text style={[styles.iconLabel, { color: palette.text }]}>
                        From account
                      </Text>
                      <View style={styles.accountChoices}>
                        {accounts.map(account => (
                          <Pressable
                            key={account.id}
                            onPress={() => setAccountId(account.id)}
                            accessibilityRole="radio"
                            accessibilityState={{
                              checked: accountId === account.id,
                            }}
                            style={[
                              styles.accountChoice,
                              {
                                borderColor:
                                  accountId === account.id
                                    ? palette.accent
                                    : palette.border,
                                backgroundColor:
                                  accountId === account.id
                                    ? palette.accentSoft
                                    : palette.surface,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.accountName,
                                { color: palette.text },
                              ]}
                            >
                              {account.name}
                            </Text>
                            <Text
                              style={[
                                styles.accountBalance,
                                { color: palette.muted },
                              ]}
                            >
                              {money(account.balance)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : (
                    <Text style={[styles.formHint, { color: palette.muted }]}>
                      No account is linked. The server will record the
                      contribution without debiting an account.
                    </Text>
                  )}
                  <Text style={[styles.formHint, { color: palette.muted }]}>
                    You’ll see how this affects your account and safe-to-spend
                    amount before confirming.
                  </Text>
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.previewHero,
                      { backgroundColor: palette.accentSoft },
                    ]}
                  >
                    <Text
                      style={[styles.previewLabel, { color: palette.muted }]}
                    >
                      CONTRIBUTION
                    </Text>
                    <Text
                      style={[styles.previewAmount, { color: palette.text }]}
                    >
                      {money(preview.amount)}
                    </Text>
                    <Text
                      style={[styles.previewCopy, { color: palette.muted }]}
                    >
                      {preview.goal.name}: {money(preview.goal.before)} →{' '}
                      {money(preview.goal.after)}
                    </Text>
                  </View>
                  {preview.account ? (
                    <View
                      style={[
                        styles.previewRow,
                        { borderBottomColor: palette.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.previewRowLabel,
                          { color: palette.muted },
                        ]}
                      >
                        {preview.account.name} after
                      </Text>
                      <Text
                        style={[
                          styles.previewRowValue,
                          { color: palette.text },
                        ]}
                      >
                        {money(preview.account.after)}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.previewRow,
                      { borderBottomColor: palette.border },
                    ]}
                  >
                    <Text
                      style={[styles.previewRowLabel, { color: palette.muted }]}
                    >
                      Safe to spend after
                    </Text>
                    <Text
                      style={[styles.previewRowValue, { color: palette.text }]}
                    >
                      {money(preview.safeToSpend.after)}
                    </Text>
                  </View>
                  {preview.warnings.map(warning => (
                    <View
                      key={warning.code}
                      style={[
                        styles.warningBox,
                        { backgroundColor: palette.warningBg },
                      ]}
                    >
                      <Icon
                        source="alert-outline"
                        size={18}
                        color={dark ? '#FFD08A' : '#9A5B00'}
                      />
                      <Text
                        style={[
                          styles.warningText,
                          { color: palette.warningText },
                        ]}
                      >
                        {warning.message}
                      </Text>
                    </View>
                  ))}
                  <Text style={[styles.formHint, { color: palette.muted }]}>
                    This is a preview. No money moves until you confirm below.
                  </Text>
                </>
              )}
              {actionError ? (
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  {actionError}
                </Text>
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {preview ? (
              <>
                <Button disabled={saving} onPress={() => setPreview(null)}>
                  Back
                </Button>
                <Button
                  loading={saving}
                  disabled={saving}
                  onPress={() => confirmContribution()}
                  textColor={palette.accent}
                >
                  Confirm transfer
                </Button>
              </>
            ) : (
              <>
                <Button disabled={saving} onPress={() => setContributing(null)}>
                  Cancel
                </Button>
                <Button
                  loading={saving}
                  disabled={saving}
                  onPress={() => reviewContribution()}
                  textColor={palette.accent}
                >
                  Review
                </Button>
              </>
            )}
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={!!deleting}
          onDismiss={() => !saving && setDeleting(null)}
          style={{ backgroundColor: palette.surface }}
        >
          <Dialog.Title style={{ color: palette.text }}>
            Remove goal?
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView>
              <Text
                style={[styles.removeDescription, { color: palette.muted }]}
              >
                {deleting?.savedAmount
                  ? `This goal has ${money(
                      deleting.savedAmount,
                    )} tracked as saved. Choose where to return it before removing the goal.`
                  : 'This removes the goal and its progress.'}
              </Text>
              {deleting?.savedAmount && accounts.length > 0 ? (
                <View style={styles.accountChoices}>
                  {accounts.map(account => (
                    <Pressable
                      key={account.id}
                      onPress={() => setReturnAccountId(account.id)}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: returnAccountId === account.id,
                      }}
                      style={[
                        styles.accountChoice,
                        {
                          borderColor:
                            returnAccountId === account.id
                              ? palette.accent
                              : palette.border,
                          backgroundColor:
                            returnAccountId === account.id
                              ? palette.accentSoft
                              : palette.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.accountName, { color: palette.text }]}
                      >
                        {account.name}
                      </Text>
                      <Text
                        style={[
                          styles.accountBalance,
                          { color: palette.muted },
                        ]}
                      >
                        Current balance {money(account.balance)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {deleting?.savedAmount && accounts.length === 0 ? (
                <Text style={[styles.formHint, { color: palette.muted }]}>
                  There are no accounts to return the tracked savings to.
                  Removing the goal will remove this tracked balance.
                </Text>
              ) : null}
              {actionError ? (
                <Text style={[styles.errorText, { color: palette.danger }]}>
                  {actionError}
                </Text>
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button disabled={saving} onPress={() => setDeleting(null)}>
              Keep goal
            </Button>
            <Button
              loading={saving}
              disabled={
                saving ||
                (!!deleting?.savedAmount &&
                  accounts.length > 0 &&
                  !returnAccountId)
              }
              onPress={() => removeGoal()}
              textColor={palette.danger}
            >
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 38 },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { borderRadius: 26, padding: 21, overflow: 'hidden' },
  summaryOrb: {
    position: 'absolute',
    right: -42,
    top: -55,
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: '#6FC58B',
    opacity: 0.13,
  },
  heroEyebrow: {
    color: '#B5D6BE',
    fontSize: 10,
    letterSpacing: 1.35,
    fontWeight: '700',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 10,
  },
  heroCaption: { color: '#C1D6C7', fontSize: 13, marginTop: 1 },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.17)',
    marginTop: 18,
    marginBottom: 14,
  },
  summaryFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSmallLabel: { color: '#B5D6BE', fontSize: 11 },
  heroSmallValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  planTag: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planTagText: { color: '#D2E8D7', fontSize: 11, fontWeight: '600' },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  sectionHint: { fontSize: 12, marginTop: 2 },
  count: { fontSize: 12, fontWeight: '600' },
  loader: { marginTop: 30 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 6,
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    marginBottom: 12,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center' },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalNameBlock: { flex: 1, marginLeft: 12, minWidth: 0 },
  goalNameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  goalName: { flexShrink: 1, fontSize: 16, fontWeight: '700' },
  goalCaption: { fontSize: 12, marginTop: 3 },
  priorityPill: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  priorityText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  editButton: { padding: 7, marginLeft: 4 },
  amountLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 18 },
  savedAmount: { fontSize: 19, fontWeight: '800' },
  targetAmount: { fontSize: 12, marginLeft: 5, flex: 1 },
  percent: { fontSize: 12, fontWeight: '800' },
  progressTrack: {
    height: 7,
    borderRadius: 5,
    marginTop: 9,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  goalBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  planCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  planCaptionText: { fontSize: 11, flexShrink: 1 },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  contributeText: { fontSize: 12, fontWeight: '700' },
  disabledButton: { opacity: 0.45 },
  deleteLink: { alignSelf: 'flex-end', paddingVertical: 7, paddingLeft: 8 },
  deleteText: { fontSize: 11 },
  limitNote: { textAlign: 'center', fontSize: 12, marginTop: 2 },
  dialogScroll: { maxHeight: 460, paddingHorizontal: 24 },
  field: { marginTop: 12 },
  formHint: { fontSize: 11, lineHeight: 16, marginTop: 9 },
  iconLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 9,
  },
  iconChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconChoice: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  priorityCopy: { flex: 1, paddingRight: 10 },
  priorityTitle: { fontSize: 13, fontWeight: '700' },
  errorText: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  accountChoices: { gap: 8, marginTop: 12 },
  accountChoice: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountName: { fontSize: 13, fontWeight: '700' },
  accountBalance: { fontSize: 11, marginTop: 3 },
  previewHero: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  previewLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  previewAmount: { fontSize: 25, fontWeight: '800', marginTop: 5 },
  previewCopy: { fontSize: 12, marginTop: 4 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  previewRowLabel: { fontSize: 12 },
  previewRowValue: { fontSize: 13, fontWeight: '700' },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 11,
    marginTop: 11,
  },
  warningText: { flex: 1, fontSize: 11, lineHeight: 16 },
  removeDescription: { lineHeight: 21 },
});
