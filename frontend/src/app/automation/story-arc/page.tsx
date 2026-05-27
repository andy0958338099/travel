"use client";

import { useState } from "react";

interface TimelineEvent {
  month: number; // 3-12
  day?: number;
  label: string;
  description: string;
}

interface CharacterArc {
  id: number;
  name: string;
  color: string;
  events: TimelineEvent[];
}

const CHARACTERS: CharacterArc[] = [
  {
    id: 1,
    name: "沈予曦",
    color: "#e879a9",
    events: [
      { month: 3, label: "相遇", description: "三月相識，開啟新的篇章" },
      { month: 5, label: "接近", description: "五月漸漸靠近" },
      { month: 7, label: "掙扎", description: "內心糾結與掙扎" },
      { month: 7, day: 17, label: "杭州之旅", description: "杭州之旅：故事高潮" },
      { month: 9, label: "試探", description: "小心翼翼的試探" },
      { month: 12, label: "告白", description: "聖誕夜的告白" },
    ],
  },
  {
    id: 2,
    name: "簡怡然",
    color: "#7dd3fc",
    events: [
      { month: 4, label: "注意到他", description: "開始注意到周敘明" },
      { month: 6, label: "製造相遇", description: "刻意製造相處機會" },
      { month: 7, day: 17, label: "杭州之旅", description: "心情轉折點" },
      { month: 8, label: "小試探", description: "小小的試探與暗示" },
      { month: 11, label: "確定期望", description: "確認自己的心意" },
    ],
  },
  {
    id: 3,
    name: "姜以甯",
    color: "#86efac",
    events: [
      { month: 3, label: "崇拜", description: "對前輩的崇拜" },
      { month: 5, label: "靠近", description: "嘗試接近" },
      { month: 7, day: 17, label: "杭州之旅", description: "杭州之旅：轉折點" },
      { month: 9, label: "競爭意識", description: "察覺到其他人的存在" },
      { month: 11, label: "決心", description: "下定決心" },
    ],
  },
  {
    id: 4,
    name: "陸思珩",
    color: "#fca5a5",
    events: [
      { month: 4, label: "觀察", description: "默默觀察" },
      { month: 6, label: "心動", description: "開始心動" },
      { month: 7, day: 17, label: "杭州之旅", description: "杭州之旅：確認心意" },
      { month: 8, label: "聚焦", description: "聚焦在她身上" },
      { month: 10, label: "確認", description: "確認自己的感情" },
    ],
  },
  {
    id: 5,
    name: "溫芯蕾",
    color: "#c4b5fd",
    events: [
      { month: 5, label: "關注", description: "開始關注沈予曦" },
      { month: 7, label: "羨慕", description: "對杭州之旅的羨慕" },
      { month: 7, day: 17, label: "杭州之旅", description: "複雜的心情" },
      { month: 9, label: "複雜情感", description: "複雜的情感糾葛" },
      { month: 11, label: "自我懷疑", description: "開始自我懷疑" },
    ],
  },
  {
    id: 6,
    name: "周敘明",
    color: "#fdba74",
    events: [
      { month: 3, label: "相遇", description: "三月相識" },
      { month: 5, label: "友好", description: "友好相處" },
      { month: 7, day: 17, label: "杭州之旅", description: "杭州之旅" },
      { month: 8, label: "曖昧", description: "曖昧的氛圍" },
      { month: 10, label: "失落", description: "感到失落" },
    ],
  },
  {
    id: 7,
    name: "季允辰",
    color: "#94a3b8",
    events: [
      { month: 4, label: "無感", description: "一開始無感的狀態" },
      { month: 7, day: 17, label: "杭州之旅", description: "被多人暗戀的核心" },
      { month: 8, label: "察覺", description: "開始察覺到她們的心思" },
      { month: 10, label: "困惑", description: "感到困惑" },
      { month: 12, label: "抉擇", description: "需要做出抉擇" },
    ],
  },
];

// Month definitions (March to December = 10 months)
const MONTHS = [
  { num: 3, label: "3月" },
  { num: 4, label: "4月" },
  { num: 5, label: "5月" },
  { num: 6, label: "6月" },
  { num: 7, label: "7月" },
  { num: 8, label: "8月" },
  { num: 9, label: "9月" },
  { num: 10, label: "10月" },
  { num: 11, label: "11月" },
  { num: 12, label: "12月" },
];

const LANE_HEIGHT = 60;
const EVENT_RADIUS = 6;
const HANGZHOU_MONTH = 7;
const HANGZHOU_DAY = 17;
const START_MONTH = 3;
const END_MONTH = 12;
const MONTH_WIDTH = 30;
const LEFT_PADDING = 60;
const TOP_PADDING = 50;

function getXPosition(month: number, day?: number): number {
  const monthOffset = month - START_MONTH;
  let x = LEFT_PADDING + monthOffset * MONTH_WIDTH;
  if (day) {
    x += (day / 31) * MONTH_WIDTH;
  }
  return x;
}

function getHangzhouX(): number {
  return getXPosition(HANGZHOU_MONTH, HANGZHOU_DAY);
}

export default function StoryArcPage() {
  const [hoveredEvent, setHoveredEvent] = useState<{
    characterId: number;
    eventIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    characterId: number;
    eventIndex: number;
  } | null>(null);

  const svgWidth = (END_MONTH - START_MONTH + 1) * MONTH_WIDTH + LEFT_PADDING + 40;
  const svgHeight = CHARACTERS.length * LANE_HEIGHT + TOP_PADDING + 30;

  const hangzhouX = getHangzhouX();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e0e0e0",
        padding: "2rem",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>
          📖 角色故事弧線時間軸
        </h1>
        <p style={{ color: "#888", margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
          2024年3月～12月 · 杭州之旅（7/17）為所有角色弧線的高潮事件
        </p>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ef4444",
            }}
          />
          <span style={{ color: "#aaa", fontSize: "0.85rem" }}>杭州之旅（7/17）</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#a855f7",
            }}
          />
          <span style={{ color: "#aaa", fontSize: "0.85rem" }}>hover 顯示詳情</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ color: "#aaa", fontSize: "0.85rem" }}>點擊查看日記</span>
        </div>
      </div>

      {/* Timeline SVG */}
      <div
        style={{
          background: "#1e293b",
          borderRadius: "16px",
          padding: "1rem",
          overflowX: "auto",
          border: "1px solid #334155",
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: "100%",
            minWidth: svgWidth,
            height: "auto",
            display: "block",
          }}
        >
          {/* Month labels at top */}
          {MONTHS.map((m, i) => (
            <g key={m.num}>
              <text
                x={LEFT_PADDING + i * MONTH_WIDTH + MONTH_WIDTH / 2}
                y={25}
                textAnchor="middle"
                fill="#64748b"
                fontSize="12"
                fontWeight="500"
              >
                {m.label}
              </text>
              {/* Vertical grid line */}
              <line
                x1={LEFT_PADDING + i * MONTH_WIDTH}
                y1={TOP_PADDING - 10}
                x2={LEFT_PADDING + i * MONTH_WIDTH}
                y2={svgHeight - TOP_PADDING}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            </g>
          ))}

          {/* Hangzhou trip vertical line */}
          <line
            x1={hangzhouX}
            y1={TOP_PADDING - 10}
            x2={hangzhouX}
            y2={svgHeight - TOP_PADDING}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <rect
            x={hangzhouX - 30}
            y={TOP_PADDING - 35}
            width={60}
            height={20}
            rx={4}
            fill="#ef4444"
          />
          <text
            x={hangzhouX}
            y={TOP_PADDING - 20}
            textAnchor="middle"
            fill="#fff"
            fontSize="10"
            fontWeight="600"
          >
            杭州之旅
          </text>

          {/* Character lanes */}
          {CHARACTERS.map((char, charIndex) => {
            const laneY = TOP_PADDING + charIndex * LANE_HEIGHT + LANE_HEIGHT / 2;
            return (
              <g key={char.id}>
                {/* Lane background */}
                <rect
                  x={LEFT_PADDING - 50}
                  y={TOP_PADDING + charIndex * LANE_HEIGHT}
                  width={svgWidth - LEFT_PADDING - 20}
                  height={LANE_HEIGHT}
                  fill={charIndex % 2 === 0 ? "#1e293b" : "#0f172a"}
                  rx={4}
                />

                {/* Lane label */}
                <text
                  x={15}
                  y={laneY + 4}
                  textAnchor="start"
                  fill={char.color}
                  fontSize="13"
                  fontWeight="600"
                >
                  {char.name}
                </text>

                {/* Lane line */}
                <line
                  x1={LEFT_PADDING}
                  y1={laneY}
                  x2={svgWidth - 20}
                  y2={laneY}
                  stroke={char.color}
                  strokeWidth="2"
                  strokeOpacity="0.3"
                />

                {/* Events */}
                {char.events.map((event, eventIndex) => {
                  const x = getXPosition(event.month, event.day);
                  const isHangzhou = event.day === 17 && event.month === 7;
                  const isHovered =
                    hoveredEvent?.characterId === char.id &&
                    hoveredEvent?.eventIndex === eventIndex;
                  const isSelected =
                    selectedEvent?.characterId === char.id &&
                    selectedEvent?.eventIndex === eventIndex;

                  return (
                    <g key={eventIndex}>
                      {/* Event dot */}
                      <circle
                        cx={x}
                        cy={laneY}
                        r={isHangzhou ? EVENT_RADIUS + 3 : EVENT_RADIUS}
                        fill={isHangzhou ? "#a855f7" : char.color}
                        stroke={isSelected || isHovered ? "#fff" : "transparent"}
                        strokeWidth={isSelected || isHovered ? 3 : 0}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => {
                          const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                          if (svgRect) {
                            const scaleX = svgRect.width / svgWidth;
                            setHoveredEvent({
                              characterId: char.id,
                              eventIndex,
                              x: x * scaleX,
                              y: laneY * (svgRect.height / svgHeight),
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredEvent(null)}
                        onClick={() =>
                          setSelectedEvent(
                            selectedEvent?.characterId === char.id &&
                              selectedEvent?.eventIndex === eventIndex
                              ? null
                              : { characterId: char.id, eventIndex }
                          )
                        }
                      />

                      {/* Event label on hover */}
                      {(isHovered || isSelected) && (
                        <text
                          x={x}
                          y={laneY - 15}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {event.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Tooltip for hovered event */}
          {hoveredEvent && (
            <g>
              {(() => {
                const char = CHARACTERS.find(
                  (c) => c.id === hoveredEvent.characterId
                );
                const event = char?.events[hoveredEvent.eventIndex];
                if (!char || !event) return null;

                const x = getXPosition(event.month, event.day);
                const charIndex = CHARACTERS.findIndex(
                  (c) => c.id === hoveredEvent.characterId
                );
                const y = TOP_PADDING + charIndex * LANE_HEIGHT + LANE_HEIGHT / 2;

                const tooltipWidth = 160;
                const tooltipHeight = 50;
                let tooltipX = x + 15;
                if (tooltipX + tooltipWidth > svgWidth - 20) {
                  tooltipX = x - tooltipWidth - 15;
                }
                const tooltipY = Math.max(10, y - tooltipHeight / 2);

                return (
                  <>
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx={6}
                      fill="#1e293b"
                      stroke={char.color}
                      strokeWidth="2"
                    />
                    <text
                      x={tooltipX + 8}
                      y={tooltipY + 18}
                      fill={char.color}
                      fontSize="12"
                      fontWeight="700"
                    >
                      {char.name} · {event.label}
                    </text>
                    <text
                      x={tooltipX + 8}
                      y={tooltipY + 35}
                      fill="#94a3b8"
                      fontSize="10"
                    >
                      {event.description}
                    </text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Selected event detail */}
      {selectedEvent && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "#1e293b",
            borderRadius: "12px",
            padding: "1.5rem",
            border: `2px solid ${
              CHARACTERS.find((c) => c.id === selectedEvent.characterId)?.color
            }40`,
          }}
        >
          {(() => {
            const char = CHARACTERS.find(
              (c) => c.id === selectedEvent.characterId
            );
            const event = char?.events[selectedEvent.eventIndex];
            if (!char || !event) return null;

            return (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: char.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {char.name[0]}
                  </div>
                  <div>
                    <h3 style={{ color: "#fff", margin: 0, fontSize: "1.2rem" }}>
                      {char.name} · {event.label}
                    </h3>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "0.85rem" }}>
                      {event.month}月{event.day ? `${event.day}日` : ""}
                    </p>
                  </div>
                </div>
                <p style={{ color: "#cbd5e1", margin: 0 }}>{event.description}</p>
                <div style={{ marginTop: "1rem" }}>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    style={{
                      background: "transparent",
                      border: "1px solid #475569",
                      color: "#94a3b8",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    關閉
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Back link */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a
          href="/automation"
          style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}
        >
          ← 返回自動化儀表板
        </a>
      </div>
    </div>
  );
}