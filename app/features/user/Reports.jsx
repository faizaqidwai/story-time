// app/components/Reports.jsx

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
import { useUser } from "../../_contexts/UserContext";
import { reportService } from "../../services/reportService";
import { useApiCall } from "../../_hooks/useApiCall";
import { useNotify } from "../../_contexts/NotificationContext";
import { FONTS } from "../../theme";
import { useTheme } from "../../_contexts/ThemeContext";
import { Image as ExpoImage } from "expo-image";

const { width: SW } = Dimensions.get("window");
const STATUS_H = Platform.OS === "android" ? 24 : 50;

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
  {
    label: "Read",
    color: C.teal,
    icon: require("../../../assets/img/read_icon.png"),
  },
  {
    label: "Guess",
    color: C.yellow,
    icon: require("../../../assets/img/guess_icon.png"),
  },
  {
    label: "Listen",
    color: C.coral,
    icon: require("../../../assets/img/listen_icon.png"),
  },
  {
    label: "Describe",
    color: C.purple,
    icon: require("../../../assets/img/describe_icon.png"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RING CHART
// ─────────────────────────────────────────────────────────────────────────────
function RingChart({
  percent,
  size = 150,
  color = C.teal,
  centerLabel,
  centerSub,
}) {
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
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thick,
          borderColor: "rgba(255,255,255,0.07)",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thick,
          borderLeftColor: p > 50 ? color : "transparent",
          borderBottomColor: p > 25 ? color : "transparent",
          borderRightColor: "transparent",
          borderTopColor: "transparent",
          transform: [{ rotate: "-45deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thick,
          borderRightColor: p > 0 ? color : "transparent",
          borderTopColor: p > 75 ? color : "transparent",
          borderLeftColor: "transparent",
          borderBottomColor: "transparent",
          transform: [{ rotate: "-45deg" }],
        }}
      />
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: C.surface,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Text style={{ fontFamily: FONTS.bold, fontSize: size * 0.22, color }}>
          {Math.round(percent)}%
        </Text>
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: size * 0.1,
            color: C.textMuted,
            textAlign: "center",
            paddingHorizontal: 8,
          }}
        >
          {centerLabel}
        </Text>
        {centerSub ? (
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: size * 0.09,
              color: C.textMuted,
              textAlign: "center",
            }}
          >
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
function StatPill({ icon, value, label, color, delay = 0, sz }) {
  const slideY = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0,
        friction: 7,
        tension: 60,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          backgroundColor: C.surfaceDim,
          borderRadius: sz.pillBorderRadius,
          borderWidth: 1.5,
          alignItems: "center",
          paddingVertical: sz.pillPaddingV,
          paddingHorizontal: sz.pillPaddingH,
          gap: sz.pillGap,
          borderColor: color + "55",
        },
        { opacity: op, transform: [{ translateY: slideY }] },
      ]}
    >
      <Text style={{ fontSize: sz.pillEmojiFontSize }}>{icon}</Text>
      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: sz.pillValueFontSize,
          color,
          letterSpacing: 0.3,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: FONTS.bold,
          fontSize: sz.pillLabelFontSize,
          color: C.textMuted,
          textAlign: "center",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY BAR CHART
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyChart({ weeks, sz }) {
  if (!weeks || weeks.length === 0) return null;
  const maxVal = Math.max(...weeks.map((w) => w.count), 1);
  const BAR_H = sz.barChartHeight;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingTop: 8,
      }}
    >
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
        const barH = fillAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [4, BAR_H],
        });
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: "70%",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 6,
                justifyContent: "flex-end",
                overflow: "hidden",
                height: BAR_H,
              }}
            >
              <Animated.View
                style={{
                  width: "100%",
                  borderRadius: 6,
                  height: barH,
                  backgroundColor: w.currentWeek
                    ? C.teal
                    : "rgba(0,188,212,0.4)",
                  shadowColor: w.currentWeek ? C.teal : "transparent",
                  shadowOpacity: 0.8,
                  shadowRadius: 6,
                }}
              />
            </View>
            {w.count > 0 && (
              <Text
                style={{
                  fontFamily: FONTS.bold,
                  fontSize: sz.barCountFontSize,
                  color: C.teal,
                }}
              >
                {w.count}
              </Text>
            )}
            <Text
              style={{
                fontFamily: FONTS.light,
                fontSize: sz.barWeekLabelFontSize,
                color: C.textMuted,
              }}
            >
              {w.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL BAR
// ─────────────────────────────────────────────────────────────────────────────
function SkillBar({ label, icon, percent, color, delay = 0, sz }) {
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
  const width = fillW.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sz.skillRowGap,
        marginBottom: sz.skillRowMarginBottom,
      }}
    >
      <ExpoImage
        source={icon}
        style={{
          width: sz.skillIconSize,
          height: sz.skillIconSize,
          flexShrink: 0,
        }}
        contentFit="contain"
      />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.skillLabelFontSize,
              color: C.textSec,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bold,
              fontSize: sz.skillPctFontSize,
              color,
            }}
          >
            {Math.round(percent)}%
          </Text>
        </View>
        <View
          style={{
            height: sz.skillTrackHeight,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: sz.skillTrackHeight / 2,
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              width,
              height: "100%",
              borderRadius: sz.skillTrackHeight / 2,
              backgroundColor: color,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 6,
              elevation: 3,
            }}
          />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORY ROW
// ─────────────────────────────────────────────────────────────────────────────
function StoryRow({ story, index, sz }) {
  const slideIn = useRef(new Animated.Value(30)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 350,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.spring(slideIn, {
        toValue: 0,
        friction: 7,
        tension: 60,
        delay: index * 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const completedCount = Math.min(story.nextActivityIndex, 4);
  const dateText = story.completedAt
    ? new Date(story.completedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : story.nextActivityIndex > 0
      ? "In progress"
      : "Not started";

  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: sz.storyRowGap,
          paddingVertical: sz.storyRowPaddingV,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.05)",
        },
        { opacity: op, transform: [{ translateX: slideIn }] },
      ]}
    >
      <View
        style={{
          width: sz.statusDotSize,
          height: sz.statusDotSize,
          borderRadius: sz.statusDotSize / 2,
          flexShrink: 0,
          backgroundColor: story.complete
            ? C.green
            : story.nextActivityIndex > 0
              ? C.yellow
              : "rgba(255,255,255,0.15)",
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: sz.storyTitleFontSize,
            color: C.textSec,
          }}
          numberOfLines={1}
        >
          {story.storyTitle}
        </Text>
        <Text
          style={{
            fontFamily: FONTS.light,
            fontSize: sz.storyDateFontSize,
            color: C.textMuted,
            marginTop: 2,
          }}
        >
          {dateText}
        </Text>
      </View>
      <View
        style={{ flexDirection: "row", gap: sz.storyDotGap, flexShrink: 0 }}
      >
        {ACTIVITY_META.map((a, i) => (
          <View
            key={i}
            style={{
              width: sz.storyDotSize,
              height: sz.storyDotSize,
              borderRadius: sz.storyDotSize / 2,
              backgroundColor:
                i < completedCount ? a.color : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, delay = 0, sz }) {
  const op = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0,
        friction: 7,
        tension: 55,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: sz.sectionCardBorderRadius,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
          padding: sz.sectionCardPadding,
          marginBottom: sz.sectionCardMarginBottom,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 5,
        },
        { opacity: op, transform: [{ translateY: slideY }] },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: sz.sectionHeaderGap,
          marginBottom: sz.sectionHeaderMarginBottom,
        }}
      >
        <Text style={{ fontSize: sz.sectionIconFontSize }}>{icon}</Text>
        <Text
          style={{
            fontFamily: FONTS.bold,
            fontSize: sz.sectionTitleFontSize,
            color: C.textPri,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const router = useRouter();
  const { currentProfile } = useUser();
  const { sizes } = useTheme();
  const sz = sizes.reports;

  const [report, setReport] = useState(null);
  const { execute, loading, error, clearError } = useApiCall();
  const notify = useNotify();

  const loadReport = async () => {
    clearError();
    await execute(() => reportService.getReport(currentProfile.id), {
      errorDisplay: "none",
      onSuccess: (data) => setReport(data),
      onError: (err) => {
        notify.toast.error(
          err?.message ??
            "Could not load report. Please check your connection.",
        );
      },
    });
  };

  useEffect(() => {
    if (currentProfile?.id) loadReport();
  }, [currentProfile?.id]);

  const formatNumber = (n) => {
    if (!n && n !== 0) return "0";
    return n > 999 ? "999+" : String(n);
  };

  const TopBar = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: sz.topBarPaddingH,
        paddingTop: STATUS_H + 10,
        paddingBottom: sz.topBarPaddingBottom,
      }}
    >
      <TouchableOpacity
        style={{
          width: sz.backBtnSize,
          height: sz.backBtnSize,
          borderRadius: sz.backBtnBorderRadius,
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons
          name="chevron-back"
          size={sz.backBtnSize * 0.55}
          color="#E0F7FA"
        />
      </TouchableOpacity>
      <Text
        style={{
          fontFamily: FONTS.bold,
          flex: 1,
          textAlign: "center",
          fontSize: sz.topTitleFontSize,
          color: C.teal,
          letterSpacing: 0.4,
          textShadowColor: "rgba(0,188,212,0.5)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        }}
      >
        Progress Report
      </Text>
      <View style={{ width: sz.backBtnSize }} />
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 32,
          }}
        >
          <Text style={{ fontSize: sz.loadingEmojiFontSize }}>📊</Text>
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: sz.loadingTextFontSize,
              color: C.textMuted,
              textAlign: "center",
            }}
          >
            Building report...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 32,
          }}
        >
          <Text style={{ fontSize: sz.loadingEmojiFontSize }}>⚠️</Text>
          <Text
            style={{
              fontFamily: FONTS.light,
              fontSize: sz.loadingTextFontSize,
              color: C.textMuted,
              textAlign: "center",
            }}
          >
            {error.message ??
              "Could not load report. Please check your connection."}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 8,
              backgroundColor: C.tealDim,
              borderRadius: sz.retryBtnBorderRadius,
              borderWidth: 1,
              borderColor: C.tealBorder,
              paddingHorizontal: sz.retryBtnPaddingH,
              paddingVertical: sz.retryBtnPaddingV,
            }}
            onPress={loadReport}
          >
            <Text
              style={{
                fontFamily: FONTS.bold,
                fontSize: sz.retryTextFontSize,
                color: C.teal,
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isEmpty = !report || report.overview?.completedAllTime === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: sz.scrollPaddingH,
          paddingBottom: sz.scrollPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Child header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: sz.childHeaderGap,
            marginBottom: sz.childHeaderMarginBottom,
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: sz.childAvatarSize,
              height: sz.childAvatarSize,
              borderRadius: sz.childAvatarBorderRadius,
              backgroundColor: C.tealDim,
              borderWidth: 2,
              borderColor: C.teal,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.bold,
                fontSize: sz.childAvatarFontSize,
                color: C.teal,
              }}
            >
              {currentProfile?.name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontFamily: FONTS.bold,
                fontSize: sz.childNameFontSize,
                color: C.textPri,
              }}
            >
              {currentProfile?.name || "Child"}
            </Text>
            <Text
              style={{
                fontFamily: FONTS.light,
                fontSize: sz.childLevelFontSize,
                color: C.textMuted,
                marginTop: 2,
              }}
            >
              Level {currentProfile?.playLevel ?? 1} · Story Time
            </Text>
          </View>
        </View>

        {isEmpty ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: sz.emptyWrapPaddingV,
              gap: sz.emptyWrapGap,
            }}
          >
            <Text style={{ fontSize: sz.emptyEmojiFontSize }}>📚</Text>
            <Text
              style={{
                fontFamily: FONTS.bold,
                fontSize: sz.emptyTitleFontSize,
                color: C.textPri,
              }}
            >
              No activity yet
            </Text>
            <Text
              style={{
                fontFamily: FONTS.light,
                fontSize: sz.emptyTextFontSize,
                color: C.textMuted,
                textAlign: "center",
                lineHeight: sz.emptyTextLineHeight,
                paddingHorizontal: 32,
              }}
            >
              Start reading stories to see progress reports here.
            </Text>
          </View>
        ) : (
          <>
            {/* Overview pills */}
            <View
              style={{
                flexDirection: "row",
                gap: sz.pillRowGap,
                marginBottom: sz.pillRowMarginBottom,
              }}
            >
              <StatPill
                icon="📖"
                value={formatNumber(report.overview.completedAllTime)}
                label="Completed"
                color={C.green}
                delay={0}
                sz={sz}
              />
              <StatPill
                icon="🔤"
                value={formatNumber(report.overview.totalWords)}
                label="Words"
                color={C.teal}
                delay={70}
                sz={sz}
              />
              <StatPill
                icon="🪙"
                value={formatNumber(report.overview.coins)}
                label="Coins"
                color={C.yellow}
                delay={140}
                sz={sz}
              />
              <StatPill
                icon="🔥"
                value={`${report.overview.streakDays}d`}
                label="Streak"
                color={C.coral}
                delay={210}
                sz={sz}
              />
            </View>

            {/* Completion ring */}
            <SectionCard
              title={`Level ${report.levelProgress.playLevel} Progress`}
              icon="🏆"
              delay={100}
              sz={sz}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <RingChart
                  percent={report.levelProgress.completionPercent}
                  size={sz.ringChartSize}
                  color={C.teal}
                  centerLabel="Complete"
                  centerSub={`${report.levelProgress.completedStories} of ${report.levelProgress.totalStories}`}
                />
                <View
                  style={{
                    flex: 1,
                    paddingLeft: sz.ringLegendPaddingLeft,
                    gap: sz.ringLegendGap,
                  }}
                >
                  {[
                    {
                      color: C.green,
                      label: "Completed",
                      value: `${report.levelProgress.completedStories} stories`,
                    },
                    {
                      color: C.yellow,
                      label: "Remaining",
                      value: `${report.levelProgress.totalStories - report.levelProgress.completedStories} stories`,
                    },
                    {
                      color: C.purple,
                      label: "Diamonds",
                      value: `${report.levelProgress.totalDiamonds} earned`,
                    },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          width: sz.legendDotSize,
                          height: sz.legendDotSize,
                          borderRadius: sz.legendDotSize / 2,
                          marginTop: 3,
                          flexShrink: 0,
                          backgroundColor: item.color,
                        }}
                      />
                      <View>
                        <Text
                          style={{
                            fontFamily: FONTS.light,
                            fontSize: sz.legendLabelFontSize,
                            color: C.textMuted,
                          }}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            fontFamily: FONTS.bold,
                            fontSize: sz.legendValueFontSize,
                            color: C.textSec,
                            marginTop: 1,
                          }}
                        >
                          {item.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </SectionCard>

            {/* Weekly chart */}
            <SectionCard title="Weekly Activity" icon="📅" delay={200} sz={sz}>
              <Text
                style={{
                  fontFamily: FONTS.light,
                  fontSize: sz.chartSubFontSize,
                  color: C.textMuted,
                  marginBottom: sz.chartSubMarginBottom,
                  marginTop: -8,
                }}
              >
                Stories completed per week · last 6 weeks
              </Text>
              <WeeklyChart weeks={report.weeklyChart} sz={sz} />
            </SectionCard>

            {/* Skill performance */}
            <SectionCard
              title="Skill Performance"
              icon="⚡"
              delay={300}
              sz={sz}
            >
              <Text
                style={{
                  fontFamily: FONTS.light,
                  fontSize: sz.chartSubFontSize,
                  color: C.textMuted,
                  marginBottom: sz.chartSubMarginBottom,
                  marginTop: -8,
                }}
              >
                How each activity type is going
              </Text>
              <View style={{ marginTop: 8 }}>
                <SkillBar
                  label="Reading Engagement"
                  icon={ACTIVITY_META[0].icon}
                  percent={report.skills.readEngagement}
                  color={C.teal}
                  delay={0}
                  sz={sz}
                />
                <SkillBar
                  label="Word Guess Win Rate"
                  icon={ACTIVITY_META[1].icon}
                  percent={report.skills.guessWinRate}
                  color={C.yellow}
                  delay={100}
                  sz={sz}
                />
                <SkillBar
                  label="Listening Accuracy"
                  icon={ACTIVITY_META[2].icon}
                  percent={report.skills.listenAccuracy}
                  color={C.coral}
                  delay={200}
                  sz={sz}
                />
                <SkillBar
                  label="Description Score"
                  icon={ACTIVITY_META[3].icon}
                  percent={report.skills.describeScore}
                  color={C.purple}
                  delay={300}
                  sz={sz}
                />
              </View>
            </SectionCard>

            {/* Story list */}
            <SectionCard
              title={`Level ${report.levelProgress.playLevel} Stories`}
              icon="📚"
              delay={400}
              sz={sz}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: sz.storyLegendGap,
                  marginBottom: 12,
                }}
              >
                {ACTIVITY_META.map((a, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: sz.storyLegendItemGap,
                    }}
                  >
                    <View
                      style={{
                        width: sz.storyLegendDotSize,
                        height: sz.storyLegendDotSize,
                        borderRadius: sz.storyLegendDotSize / 2,
                        backgroundColor: a.color,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: FONTS.light,
                        fontSize: sz.legendLabelFontSize,
                        color: C.textMuted,
                      }}
                    >
                      {a.label}
                    </Text>
                  </View>
                ))}
              </View>
              {report.storyList.map((story, i) => (
                <StoryRow key={story.storyId} story={story} index={i} sz={sz} />
              ))}
              {report.storyList.length === 0 && (
                <Text
                  style={{
                    fontFamily: FONTS.light,
                    fontSize: sz.chartSubFontSize,
                    color: C.textMuted,
                    textAlign: "center",
                    paddingVertical: 12,
                  }}
                >
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
