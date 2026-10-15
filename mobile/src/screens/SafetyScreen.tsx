import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

import { api, getErrorMessage } from '../api/client';
import Screen from '../components/Screen';
import { formatDate } from '../utils/format';
import { useMoney } from '../utils/useMoney';

interface PendingPayment {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
  paymentMethod: string | null;
  location: string | null;
  riskLevel: string | null;
  reasons: string[];
}

interface SafetyOverview {
  state: 'REVIEW_NEEDED' | 'ALL_CLEAR';
  pending: PendingPayment[];
  pendingCount: number;
  disputedCount: number;
  realtimeAlerts: boolean;
}

export default function SafetyScreen() {
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
    accent: dark ? '#83D39B' : '#347B51',
    danger: theme.colors.error,
    warning: dark ? '#FFD18B' : '#8C5600',
    warningBg: dark ? '#45351E' : '#FFF1D3',
    shieldBg: 'rgba(255,255,255,0.12)',
    actionText: dark ? '#102318' : '#FFFFFF',
  };

  const [overview, setOverview] = useState<SafetyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SafetyOverview>('/safety');
      setOverview(data);
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

  const review = async (
    payment: PendingPayment,
    decision: 'RECOGNIZED' | 'NOT_ME',
  ) => {
    setActingOn(payment.id);
    setError(null);
    try {
      await api.post(`/transactions/${payment.id}/review`, { decision });
      await load(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setActingOn(null);
    }
  };

  const dispute = (payment: PendingPayment) => {
    Alert.alert(
      'Report this payment?',
      'We’ll mark it as disputed. It will remain excluded from totals and won’t affect the linked account balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report payment',
          style: 'destructive',
          onPress: () => review(payment, 'NOT_ME'),
        },
      ],
    );
  };

  const statusClear = overview?.state === 'ALL_CLEAR';

  return (
    <Screen title="Safety" style={{ backgroundColor: palette.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={palette.accent}
          />
        }
      >
        <View style={[styles.statusCard, { backgroundColor: palette.forest }]}>
          <View style={styles.statusTop}>
            <View
              style={[styles.shield, { backgroundColor: palette.shieldBg }]}
            >
              <Icon
                source={
                  !overview
                    ? 'shield-outline'
                    : statusClear
                    ? 'shield-check-outline'
                    : 'shield-alert-outline'
                }
                size={26}
                color="#E4F5E9"
              />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusEyebrow}>PAYMENT PROTECTION</Text>
              <Text style={styles.statusTitle}>
                {!overview
                  ? loading
                    ? 'Checking safety'
                    : 'Status unavailable'
                  : statusClear
                  ? 'You’re all clear'
                  : 'Needs your review'}
              </Text>
              <Text style={styles.statusCaption}>
                {!overview
                  ? 'Refresh to check current payment reviews.'
                  : statusClear
                  ? 'No payments are waiting for your decision.'
                  : `${overview.pendingCount} payment${
                      overview.pendingCount === 1 ? '' : 's'
                    } paused until you review.`}
              </Text>
            </View>
          </View>
          <View style={styles.statusFoot}>
            <View style={styles.statusMetric}>
              <Text style={styles.statusMetricValue}>
                {overview ? overview.pendingCount : '—'}
              </Text>
              <Text style={styles.statusMetricLabel}>Awaiting review</Text>
            </View>
            <View style={styles.statusMetricDivider} />
            <View style={styles.statusMetric}>
              <Text style={styles.statusMetricValue}>
                {overview ? overview.disputedCount : '—'}
              </Text>
              <Text style={styles.statusMetricLabel}>Disputed · 30 days</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Icon
              source="cloud-alert-outline"
              size={20}
              color={palette.danger}
            />
            <View style={styles.errorCopy}>
              <Text style={[styles.errorTitle, { color: palette.text }]}>
                Couldn’t update safety status
              </Text>
              <Text style={[styles.errorMessage, { color: palette.muted }]}>
                {error}
              </Text>
            </View>
            <Button compact onPress={() => load()} textColor={palette.accent}>
              Retry
            </Button>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={palette.accent} style={styles.loader} />
        ) : overview ? (
          <>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Review payments
                </Text>
                <Text style={[styles.sectionHint, { color: palette.muted }]}>
                  Paused payments don’t affect account balances until confirmed.
                </Text>
              </View>
            </View>

            {overview?.pending.length ? (
              overview.pending.map(payment => {
                const pending = actingOn === payment.id;
                return (
                  <View
                    key={payment.id}
                    style={[
                      styles.paymentCard,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.paymentTop}>
                      <View
                        style={[
                          styles.paymentIcon,
                          { backgroundColor: palette.warningBg },
                        ]}
                      >
                        <Icon
                          source="credit-card-clock-outline"
                          size={21}
                          color={palette.warning}
                        />
                      </View>
                      <View style={styles.paymentMain}>
                        <Text
                          numberOfLines={1}
                          style={[styles.merchant, { color: palette.text }]}
                        >
                          {payment.merchant}
                        </Text>
                        <Text
                          style={[styles.paymentMeta, { color: palette.muted }]}
                        >
                          {payment.category.toLowerCase().replace(/_/g, ' ')} ·{' '}
                          {formatDate(payment.date)}
                        </Text>
                      </View>
                      <Text style={[styles.amount, { color: palette.text }]}>
                        {money(payment.amount)}
                      </Text>
                    </View>

                    <View style={styles.paymentDetails}>
                      {payment.paymentMethod ? (
                        <View style={styles.detail}>
                          <Icon
                            source="credit-card-outline"
                            size={14}
                            color={palette.muted}
                          />
                          <Text
                            style={[
                              styles.detailText,
                              { color: palette.muted },
                            ]}
                          >
                            {payment.paymentMethod}
                          </Text>
                        </View>
                      ) : null}
                      {payment.location ? (
                        <View style={styles.detail}>
                          <Icon
                            source="map-marker-outline"
                            size={14}
                            color={palette.muted}
                          />
                          <Text
                            style={[
                              styles.detailText,
                              { color: palette.muted },
                            ]}
                          >
                            {payment.location}
                          </Text>
                        </View>
                      ) : null}
                      {payment.riskLevel ? (
                        <View
                          style={[
                            styles.riskTag,
                            { backgroundColor: palette.warningBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskText,
                              { color: palette.warning },
                            ]}
                          >
                            {payment.riskLevel.replace(/_/g, ' ').toLowerCase()}{' '}
                            risk
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {payment.reasons?.length ? (
                      <View
                        style={[
                          styles.reasonBox,
                          { backgroundColor: palette.surfaceAlt },
                        ]}
                      >
                        <Text
                          style={[styles.reasonLabel, { color: palette.muted }]}
                        >
                          WHY IT WAS PAUSED
                        </Text>
                        {payment.reasons.map((reason, index) => (
                          <View
                            key={`${reason}-${index}`}
                            style={styles.reasonRow}
                          >
                            <View
                              style={[
                                styles.reasonDot,
                                { backgroundColor: palette.accent },
                              ]}
                            />
                            <Text
                              style={[
                                styles.reasonText,
                                { color: palette.text },
                              ]}
                            >
                              {reason}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={[styles.question, { color: palette.text }]}>
                      Do you recognize this payment?
                    </Text>
                    <View style={styles.actions}>
                      <Pressable
                        disabled={pending}
                        accessibilityRole="button"
                        accessibilityLabel={`Report ${payment.merchant} as not yours`}
                        onPress={() => dispute(payment)}
                        style={[
                          styles.reportButton,
                          { borderColor: palette.border },
                        ]}
                      >
                        {pending ? (
                          <ActivityIndicator
                            size="small"
                            color={palette.accent}
                          />
                        ) : (
                          <Icon
                            source="alert-circle-outline"
                            size={17}
                            color={palette.danger}
                          />
                        )}
                        <Text
                          style={[styles.reportText, { color: palette.danger }]}
                        >
                          Not me
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={pending}
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm ${payment.merchant} is yours`}
                        onPress={() =>
                          Alert.alert(
                            'Confirm this payment?',
                            'The payment will be included in your finances and applied to its linked account balance, if any.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Yes, I recognize it',
                                onPress: () => review(payment, 'RECOGNIZED'),
                              },
                            ],
                          )
                        }
                        style={[
                          styles.confirmButton,
                          { backgroundColor: palette.accent },
                        ]}
                      >
                        {pending ? (
                          <ActivityIndicator
                            size="small"
                            color={palette.actionText}
                          />
                        ) : (
                          <Icon
                            source="check"
                            size={18}
                            color={palette.actionText}
                          />
                        )}
                        <Text
                          style={[
                            styles.confirmText,
                            { color: palette.actionText },
                          ]}
                        >
                          I recognize it
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            ) : overview ? (
              <View
                style={[
                  styles.clearCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.clearIcon,
                    { backgroundColor: palette.surfaceAlt },
                  ]}
                >
                  <Icon
                    source="check-decagram-outline"
                    size={23}
                    color={palette.accent}
                  />
                </View>
                <Text style={[styles.clearTitle, { color: palette.text }]}>
                  Nothing to review
                </Text>
                <Text style={[styles.clearCopy, { color: palette.muted }]}>
                  If a payment needs your attention, it will appear here before
                  it affects your totals.
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  Safety status
                </Text>
                <Text style={[styles.sectionHint, { color: palette.muted }]}>
                  Current account protection details.
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: palette.surfaceAlt },
                ]}
              >
                <Icon
                  source={
                    overview?.realtimeAlerts
                      ? 'bell-check-outline'
                      : 'bell-off-outline'
                  }
                  size={19}
                  color={palette.accent}
                />
              </View>
              <View style={styles.infoBody}>
                <Text style={[styles.infoTitle, { color: palette.text }]}>
                  Payment alerts
                </Text>
                <Text
                  style={[styles.infoDescription, { color: palette.muted }]}
                >
                  {overview?.realtimeAlerts
                    ? 'A device is registered for push notifications.'
                    : 'No device is currently registered for push notifications.'}
                </Text>
              </View>
              <Icon
                source={
                  overview?.realtimeAlerts
                    ? 'check-circle'
                    : 'information-outline'
                }
                size={19}
                color={
                  overview?.realtimeAlerts ? palette.accent : palette.muted
                }
              />
            </View>
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: palette.surfaceAlt },
                ]}
              >
                <Icon
                  source="pause-circle-outline"
                  size={19}
                  color={palette.accent}
                />
              </View>
              <View style={styles.infoBody}>
                <Text style={[styles.infoTitle, { color: palette.text }]}>
                  Paused until you decide
                </Text>
                <Text
                  style={[styles.infoDescription, { color: palette.muted }]}
                >
                  Payments awaiting review are excluded from totals and account
                  balance changes.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  statusCard: { borderRadius: 26, padding: 20, overflow: 'hidden' },
  statusTop: { flexDirection: 'row', alignItems: 'center' },
  shield: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: { flex: 1, marginLeft: 13 },
  statusEyebrow: {
    color: '#B5D6BE',
    fontSize: 9,
    letterSpacing: 1.15,
    fontWeight: '700',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 3,
  },
  statusCaption: {
    color: '#C1D6C7',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  statusFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  statusMetric: { flex: 1 },
  statusMetricValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  statusMetricLabel: { color: '#B5D6BE', fontSize: 10, marginTop: 3 },
  statusMetricDivider: {
    height: 34,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.17)',
    marginHorizontal: 14,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 12, fontWeight: '700' },
  errorMessage: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  loader: { marginTop: 30 },
  sectionHeading: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  sectionHint: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  paymentCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
    marginBottom: 11,
  },
  paymentTop: { flexDirection: 'row', alignItems: 'center' },
  paymentIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMain: { flex: 1, minWidth: 0, marginLeft: 11, marginRight: 8 },
  merchant: { fontSize: 15, fontWeight: '700' },
  paymentMeta: { fontSize: 11, marginTop: 3, textTransform: 'capitalize' },
  amount: { fontSize: 15, fontWeight: '800' },
  paymentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 9,
    marginTop: 13,
  },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 11 },
  riskTag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  riskText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  reasonBox: { borderRadius: 13, padding: 11, marginTop: 13 },
  reasonLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 3 },
  reasonDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 7,
  },
  reasonText: { flex: 1, fontSize: 11, lineHeight: 16 },
  question: { fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 9 },
  actions: { flexDirection: 'row', gap: 8 },
  reportButton: {
    flex: 0.8,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportText: { fontSize: 11, fontWeight: '700' },
  confirmButton: {
    flex: 1.2,
    minHeight: 43,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmText: { fontSize: 11, fontWeight: '700' },
  clearCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
  },
  clearIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  clearTitle: { fontSize: 16, fontWeight: '700' },
  clearCopy: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 275,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginBottom: 9,
  },
  infoIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: { flex: 1, marginHorizontal: 11 },
  infoTitle: { fontSize: 13, fontWeight: '700' },
  infoDescription: { fontSize: 11, lineHeight: 16, marginTop: 3 },
});
