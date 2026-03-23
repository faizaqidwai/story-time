// app/components/Reports.jsx
//
// Progress Report screen — shown to parents from Account → Progress Reports.
// All data comes from GET /report/profile/{profileId} (ReportController).
//
// Sections (matching ReportResponse structure):
//  1. Child header — name + level
//  2. Overview pills — completed (all time), words, coins, streak
//  3. Completion ring — current level % done
//  4. Weekly bar chart — stories completed per week, last 6 weeks (all time)
//  5. Skill performance bars — Read, Guess, Listen, Describe (all time)
//  6. Story progress list — current level stories with activity dots

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../_contexts/UserContext";
import { reportService } from "../services/reportService";

const { width: SW } = Dimensions.get("window");
const STATUS_H = Platform.OS === "android" ? 24 : 50;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#08081a",
  surface: "#111830",
  surfaceDim: "rgba(255,255,255,0.05)",
  teal: "#00BCD4",
  tealDim: "rgba(0,188,212,0.15)",
  tealBorder: "rgba(0,188,212,0.35)",
  yellow: "#FFD54F",
  yellowDim: "rgba(255,213,79,0.15)",
  yellowBorder: "rgba(255,213,79,0.4)",
  green: "#4CAF50",
  greenDim: "rgba(76,175,80,0.18)",
  greenBorder: "rgba(76,175,80,0.45)",
  purple: "#9652D9",
  purpleDim: "rgba(150,82,217,0.18)",
  purpleBorder: "rgba(150,82,217,0.4)",
  coral: "#FF7043",
  coralDim: "rgba(255,112,67,0.15)",
  coralBorder: "rgba(255,112,67,0.4)",
  textPri: "#E0F7FA",
  textSec: "#B2EBF2",
  textMuted: "#546E7A",
};

const ACTIVITY_META = [
  { label: "Read",     color: C.teal,   icon: require("../../assets/img/read_icon.png") },
  { label: "Guess",    color: C.yellow, icon: require("../../assets/img/guess_icon.png") },
  { label: "Listen",   color: C.coral,  icon: require("../../assets/img/listen_icon.png") },
  { label: "Describe", color: C.purple, icon: require("../../assets/img/describe_icon.png") },
];

// ─────────────────────────────────────────────────────────────────────────────
// RING CHART
// Simulates a circular progress ring using border segments.
// ─────────────────────────────────────────────────────────────────────────────
function RingChart({ percent, size = 150, color = C.teal, centerLabel, centerSub }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: percent,
      duration: 1200,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const thick = size * 0.095;
  const inner = size - thick * 2;
  const p = percent;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Track */}
      <View style={{
        position: "absolute", width: size, height: size,
        borderRadius: size / 2, borderWidth: thick,
        borderColor: "rgba(255,255,255,0.07)",
      }} />
      {/* Left arc (covers 0–180°) */}
      <View style={{
        position: "absolute", width: size, height: size,
        borderRadius: size / 2, borderWidth: thick,
        borderLeftColor: p > 50 ? color : "transparent",
        borderBottomColor: p > 25 ? color : "transparent",
        borderRightColor: "transparent", borderTopColor: "transparent",
        transform: [{ rotate: "-45deg" }],
      }} />
      {/* Right arc (covers 180–360°) */}
      <View style={{
        position: "absolute", width: size, height: size,
        borderRadius: size / 2, borderWidth: thick,
        borderRightColor: p > 0 ? color : "transparent",
        borderTopColor: p > 75 ? color : "transparent",
        borderLeftColor: "transparent", borderBottomColor: "transparent",
        transform: [{ rotate: "-45deg" }],
      }} />
      {/* Inner content */}
      <View style={{
        width: inner, height: inner, borderRadius: inner / 2,
        backgroundColor: C.surface, alignItems: "center",
        justifyContent: "center", gap: 2,
      }}>
        <Text style={{ fontSize: size * 0.22, fontWeight: "900", color }}>
          {Math.round(percent)}%
        </Text>
        <Text style={{ fontSize: size * 0.1, color: C.textMuted, fontWeight: "700", textAlign: "center", paddingHorizontal: 8 }}>
          {centerLabel}
        </Text>
        {centerSub ? (
          <Text style={{ fontSize: size * 0.09, color: C.textMuted, textAlign: "center" }}>
            {centerSub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT PILL
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color, delay = 0 }) {
  const slideY = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 7, tension: 60, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[pillS.pill, { borderColor: color + "55", opacity: op, transform: [{ translateY: slideY }] }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[pillS.value, { color }]}>{value}</Text>
      <Text style={pillS.label}>{label}</Text>
    </Animated.View>
  );
}

const pillS = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: C.surfaceDim,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 4,
  },
  value: { fontSize: 19, fontWeight: "900", letterSpacing: 0.3 },
  label: { fontSize: 9, color: C.textMuted, fontWeight: "700", textAlign: "center", letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY BAR CHART
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyChart({ weeks }) {
  if (!weeks || weeks.length === 0) return null;
  const maxVal = Math.max(...weeks.map((w) => w.count), 1);
  const BAR_H = 90;

  return (
    <View style={barS.wrap}>
      {weeks.map((w, i) => {
        const fillAnim = useRef(new Animated.Value(0)).current;
        useEffect(() => {
          Animated.timing(fillAnim, {
            toValue: w.count / maxVal,
            duration: 700,
            delay: i * 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }, [w.count]);

        const barH = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [4, BAR_H] });

        return (
          <View key={i} style={barS.col}>
            <View style={[barS.track, { height: BAR_H }]}>
              <Animated.View style={[
                barS.fill,
                {
                  height: barH,
                  backgroundColor: w.currentWeek ? C.teal : "rgba(0,188,212,0.4)",
                  shadowColor: w.currentWeek ? C.teal : "transparent",
                  shadowOpacity: 0.8, shadowRadius: 6,
                },
              ]} />
            </View>
            {w.count > 0 && <Text style={barS.count}>{w.count}</Text>}
            <Text style={barS.weekLabel}>{w.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const barS = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 8 },
  col: { flex: 1, alignItems: "center", gap: 4 },
  track: { width: "70%", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  fill: { width: "100%", borderRadius: 6 },
  count: { fontSize: 10, fontWeight: "800", color: C.teal },
  weekLabel: { fontSize: 9, color: C.textMuted, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────────────────────
// SKILL BAR
// ─────────────────────────────────────────────────────────────────────────────
function SkillBar({ label, icon, percent, color, delay = 0 }) {
  const fillW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillW, {
      toValue: percent,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const width = fillW.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <View style={skillS.row}>
      <Image source={icon} style={skillS.icon} resizeMode="contain" />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={skillS.labelRow}>
          <Text style={skillS.label}>{label}</Text>
          <Text style={[skillS.pct, { color }]}>{Math.round(percent)}%</Text>
        </View>
        <View style={skillS.track}>
          <Animated.View style={[skillS.fill, { width, backgroundColor: color, shadowColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const skillS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  icon: { width: 26, height: 26, flexShrink: 0 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "700", color: C.textSec },
  pct: { fontSize: 13, fontWeight: "900" },
  track: { height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6, elevation: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY ROW
// ─────────────────────────────────────────────────────────────────────────────
function StoryRow({ story, index }) {
  const slideIn = useRef(new Animated.Value(30)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 350, delay: index * 55, useNativeDriver: true }),
      Animated.spring(slideIn, { toValue: 0, friction: 7, tension: 60, delay: index * 55, useNativeDriver: true }),
    ]).start();
  }, []);

  const completedCount = Math.min(story.nextActivityIndex, 4);
  const dateText = story.completedAt
    ? new Date(story.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : story.nextActivityIndex > 0
    ? "In progress"
    : "Not started";

  return (
    <Animated.View style={[storyS.row, { opacity: op, transform: [{ translateX: slideIn }] }]}>
      <View style={[storyS.statusDot, { backgroundColor: story.complete ? C.green : story.nextActivityIndex > 0 ? C.yellow : "rgba(255,255,255,0.15)" }]} />
      <View style={{ flex: 1 }}>
        <Text style={storyS.title} numberOfLines={1}>{story.storyTitle}</Text>
        <Text style={storyS.date}>{dateText}</Text>
      </View>
      <View style={storyS.dots}>
        {ACTIVITY_META.map((a, i) => (
          <View key={i} style={[storyS.dot, { backgroundColor: i < completedCount ? a.color : "rgba(255,255,255,0.1)" }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const storyS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  title: { fontSize: 13, fontWeight: "700", color: C.textSec },
  date: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  dots: { flexDirection: "row", gap: 5, flexShrink: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, delay = 0 }) {
  const op = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, friction: 7, tension: 55, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[secS.card, { opacity: op, transform: [{ translateY: slideY }] }]}>
      <View style={secS.header}>
        <Text style={secS.icon}>{icon}</Text>
        <Text style={secS.title}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

const secS = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: "900", color: C.textPri, letterSpacing: 0.3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const router = useRouter();
  const { currentProfile } = useUser();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentProfile?.id) {
      loadReport();
    }
  }, [currentProfile?.id]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getReport(currentProfile.id);
      setReport(data);
    } catch (e) {
      console.error("[Reports] Failed to load report:", e);
      setError("Could not load report. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n) => {
    if (!n && n !== 0) return "0";
    return n > 999 ? "999+" : String(n);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#E0F7FA" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Progress Report</Text>
          <View style={styles.topSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingEmoji}>📊</Text>
          <Text style={styles.loadingText}>Building report...</Text>
        </View>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#E0F7FA" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Progress Report</Text>
          <View style={styles.topSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingEmoji}>⚠️</Text>
          <Text style={styles.loadingText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadReport}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── No data ──────────────────────────────────────────────────────────────
  const isEmpty = !report || report.overview?.completedAllTime === 0;

  return (
    <View style={styles.root}>
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#E0F7FA" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Progress Report</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── CHILD HEADER ── */}
        <View style={styles.childHeader}>
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>
              {currentProfile?.name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View>
            <Text style={styles.childName}>{currentProfile?.name || "Child"}</Text>
            <Text style={styles.childLevel}>Level {currentProfile?.playLevel ?? 1} · Word Bird</Text>
          </View>
        </View>

        {isEmpty ? (
          /* ── EMPTY STATE ── */
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>
              Start reading stories to see progress reports here.
            </Text>
          </View>
        ) : (
          <>
            {/* ── OVERVIEW PILLS (all time) ── */}
            <View style={styles.pillRow}>
              <StatPill
                icon="📖"
                value={formatNumber(report.overview.completedAllTime)}
                label="Completed"
                color={C.green}
                delay={0}
              />
              <StatPill
                icon="🔤"
                value={formatNumber(report.overview.totalWords)}
                label="Words"
                color={C.teal}
                delay={70}
              />
              <StatPill
                icon="🪙"
                value={formatNumber(report.overview.coins)}
                label="Coins"
                color={C.yellow}
                delay={140}
              />
              <StatPill
                icon="🔥"
                value={`${report.overview.streakDays}d`}
                label="Streak"
                color={C.coral}
                delay={210}
              />
            </View>

            {/* ── COMPLETION RING (current level) ── */}
            <SectionCard title={`Level ${report.levelProgress.playLevel} Progress`} icon="🏆" delay={100}>
              <View style={styles.ringRow}>
                <RingChart
                  percent={report.levelProgress.completionPercent}
                  size={148}
                  color={C.teal}
                  centerLabel="Complete"
                  centerSub={`${report.levelProgress.completedStories} of ${report.levelProgress.totalStories}`}
                />
                <View style={styles.ringLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: C.green }]} />
                    <View>
                      <Text style={styles.legendLabel}>Completed</Text>
                      <Text style={styles.legendValue}>{report.levelProgress.completedStories} stories</Text>
                    </View>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: C.yellow }]} />
                    <View>
                      <Text style={styles.legendLabel}>Remaining</Text>
                      <Text style={styles.legendValue}>
                        {report.levelProgress.totalStories - report.levelProgress.completedStories} stories
                      </Text>
                    </View>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: C.purple }]} />
                    <View>
                      <Text style={styles.legendLabel}>Diamonds</Text>
                      <Text style={styles.legendValue}>{report.levelProgress.totalDiamonds} earned</Text>
                    </View>
                  </View>
                </View>
              </View>
            </SectionCard>

            {/* ── WEEKLY CHART (all time) ── */}
            <SectionCard title="Weekly Activity" icon="📅" delay={200}>
              <Text style={styles.chartSub}>Stories completed per week · last 6 weeks</Text>
              <WeeklyChart weeks={report.weeklyChart} />
            </SectionCard>

            {/* ── SKILL PERFORMANCE (all time) ── */}
            <SectionCard title="Skill Performance" icon="⚡" delay={300}>
              <Text style={styles.chartSub}>How each activity type is going</Text>
              <View style={{ marginTop: 8 }}>
                <SkillBar
                  label="Reading Engagement"
                  icon={ACTIVITY_META[0].icon}
                  percent={report.skills.readEngagement}
                  color={C.teal}
                  delay={0}
                />
                <SkillBar
                  label="Word Guess Win Rate"
                  icon={ACTIVITY_META[1].icon}
                  percent={report.skills.guessWinRate}
                  color={C.yellow}
                  delay={100}
                />
                <SkillBar
                  label="Listening Accuracy"
                  icon={ACTIVITY_META[2].icon}
                  percent={report.skills.listenAccuracy}
                  color={C.coral}
                  delay={200}
                />
                <SkillBar
                  label="Description Score"
                  icon={ACTIVITY_META[3].icon}
                  percent={report.skills.describeScore}
                  color={C.purple}
                  delay={300}
                />
              </View>
            </SectionCard>

            {/* ── STORY LIST (current level) ── */}
            <SectionCard title={`Level ${report.levelProgress.playLevel} Stories`} icon="📚" delay={400}>
              {/* Activity dot legend */}
              <View style={styles.storyLegendRow}>
                {ACTIVITY_META.map((a, i) => (
                  <View key={i} style={styles.storyLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: a.color, width: 8, height: 8 }]} />
                    <Text style={styles.legendLabel}>{a.label}</Text>
                  </View>
                ))}
              </View>
              {report.storyList.map((story, i) => (
                <StoryRow key={story.storyId} story={story} index={i} />
              ))}
              {report.storyList.length === 0 && (
                <Text style={[styles.chartSub, { textAlign: "center", paddingVertical: 12 }]}>
                  No stories started yet in this level.
                </Text>
              )}
            </SectionCard>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: STATUS_H + 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  topTitle: {
    flex: 1, textAlign: "center",
    fontSize: 17, fontWeight: "900", color: C.teal, letterSpacing: 0.4,
    textShadowColor: "rgba(0,188,212,0.5)",
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  topSpacer: { width: 40 },

  // Loading / error
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingEmoji: { fontSize: 48 },
  loadingText: { fontSize: 15, color: C.textMuted, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    backgroundColor: C.tealDim,
    borderRadius: 12, borderWidth: 1, borderColor: C.tealBorder,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { fontSize: 14, fontWeight: "700", color: C.teal },

  // Child header
  childHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20, marginTop: 4 },
  childAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.tealDim, borderWidth: 2, borderColor: C.teal,
    alignItems: "center", justifyContent: "center",
  },
  childAvatarText: { fontSize: 22, fontWeight: "900", color: C.teal },
  childName: { fontSize: 20, fontWeight: "900", color: C.textPri },
  childLevel: { fontSize: 12, color: C.textMuted, marginTop: 2, fontWeight: "600" },

  // Pills
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 14 },

  // Ring section
  ringRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ringLegend: { flex: 1, paddingLeft: 18, gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  legendLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  legendValue: { fontSize: 13, color: C.textSec, fontWeight: "800", marginTop: 1 },

  // Chart subtitle
  chartSub: { fontSize: 11, color: C.textMuted, fontWeight: "600", marginBottom: 12, marginTop: -8 },

  // Story list legend
  storyLegendRow: { flexDirection: "row", gap: 14, marginBottom: 12 },
  storyLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: C.textPri },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 21, paddingHorizontal: 32 },
});
