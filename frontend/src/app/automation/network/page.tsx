'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============ Types ============
interface Character {
  id: string;
  name: string;
  color: string;
  gender: 'female' | 'male';
  x: number;
  y: number;
  relationships: Relationship[];
}

interface Relationship {
  targetId: string;
  type: 'secret_crush' | 'bestie';
  label: string;
}

interface TooltipData {
  name: string;
  description: string;
  x: number;
  y: number;
}

// ============ Character Data ============
const CHARACTERS: Character[] = [
  {
    id: 'C001',
    name: '沈予曦',
    color: '#e879a9',
    gender: 'female',
    x: 680,
    y: 350,
    relationships: [
      { targetId: 'C007', type: 'secret_crush', label: '暗戀' },
      { targetId: 'C002', type: 'bestie', label: '摯友' },
    ],
  },
  {
    id: 'C002',
    name: '簡怡然',
    color: '#7dd3fc',
    gender: 'female',
    x: 540,
    y: 592,
    relationships: [
      { targetId: 'C006', type: 'secret_crush', label: '暗戀' },
      { targetId: 'C001', type: 'bestie', label: '摯友' },
    ],
  },
  {
    id: 'C003',
    name: '姜以甯',
    color: '#86efac',
    gender: 'female',
    x: 200,
    y: 592,
    relationships: [
      { targetId: 'C007', type: 'secret_crush', label: '暗戀（前輩）' },
    ],
  },
  {
    id: 'C004',
    name: '陸思珩',
    color: '#fca5a5',
    gender: 'female',
    x: 120,
    y: 350,
    relationships: [
      { targetId: 'C007', type: 'secret_crush', label: '暗戀（定焦女孩）' },
    ],
  },
  {
    id: 'C005',
    name: '溫芯蕾',
    color: '#c4b5fd',
    gender: 'female',
    x: 200,
    y: 108,
    relationships: [
      { targetId: 'C001', type: 'secret_crush', label: '暗戀' },
    ],
  },
  {
    id: 'C006',
    name: '周敘明',
    color: '#fdba74',
    gender: 'male',
    x: 540,
    y: 108,
    relationships: [
      { targetId: 'C002', type: 'secret_crush', label: '暗戀' },
    ],
  },
  {
    id: 'C007',
    name: '季允辰',
    color: '#94a3b8',
    gender: 'male',
    x: 400,
    y: 350,
    relationships: [],
  },
];

// ============ Styles ============
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .node-group {
    animation: float 3s ease-in-out infinite;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .node-group:hover {
    transform: scale(1.1);
  }

  .node-female {
    fill: #ffffff;
    stroke-width: 3;
  }

  .node-male {
    fill: #ffffff;
    stroke-width: 3;
  }

  .center-node {
    animation: float 3s ease-in-out infinite, pulse 2s ease-in-out infinite;
  }

  .relationship-line-secret-crush {
    stroke: #ef4444;
    stroke-width: 2;
    stroke-dasharray: 8, 4;
    fill: none;
  }

  .relationship-line-bestie {
    stroke: #3b82f6;
    stroke-width: 2;
    fill: none;
  }

  .arrow-marker-secret-crush {
    fill: #ef4444;
  }

  .arrow-marker-bestie {
    fill: #3b82f6;
  }

  .tooltip {
    position: fixed;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 12px 16px;
    pointer-events: none;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    min-width: 150px;
  }

  .tooltip-name {
    color: #ffffff;
    font-weight: 600;
    font-size: 16px;
    margin-bottom: 6px;
  }

  .tooltip-desc {
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.4;
  }

  .title {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 2px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .legend {
    position: fixed;
    bottom: 24px;
    left: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 100;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-size: 13px;
  }

  .legend-line-secret-crush {
    width: 30px;
    height: 2px;
    background: #ef4444;
    border-style: dashed;
  }

  .legend-line-bestie {
    width: 30px;
    height: 2px;
    background: #3b82f6;
  }

  .legend-shape-female {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #94a3b8;
  }

  .legend-shape-male {
    width: 12px;
    height: 12px;
    background: #ffffff;
    border: 2px solid #94a3b8;
  }
`;

// ============ Components ============
export default function NetworkPage() {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Build lookup map for character relationships
  const charMap = new Map(CHARACTERS.map((c) => [c.id, c]));

  // Collect all unique relationships
  const relationships: Array<{
    from: Character;
    to: Character;
    type: 'secret_crush' | 'bestie';
    label: string;
  }> = [];

  const seen = new Set<string>();

  CHARACTERS.forEach((char) => {
    char.relationships.forEach((rel) => {
      const target = charMap.get(rel.targetId);
      if (!target) return;

      // Create unique key to avoid duplicate lines
      const key = [char.id, rel.targetId].sort().join('-');
      if (seen.has(key)) return;
      seen.add(key);

      relationships.push({
        from: char,
        to: target,
        type: rel.type,
        label: rel.label,
      });
    });
  });

  // Handle node click - navigate to character diary
  const handleNodeClick = useCallback(
    (id: string) => {
      router.push(`/characters/diaries?char_id=${id}`);
    },
    [router]
  );

  // Handle mouse events for tooltip
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, char: Character) => {
      const rect = (e.target as SVGElement).getBoundingClientRect();
      const relDescriptions = char.relationships
        .map((r) => {
          const target = charMap.get(r.targetId);
          return `${r.label} → ${target?.name ?? r.targetId}`;
        })
        .join('；');

      setTooltip({
        name: char.name,
        description: relDescriptions || '（無關係線）',
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    },
    [charMap]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Calculate position for relationship line with offset to avoid overlap with nodes
  const getLineEndPoints = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    nodeRadius = 30
  ) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return { x1: fromX, y1: fromY, x2: toX, y2: toY };

    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;

    // Start from edge of source node, end at edge of target node
    const x1 = fromX + nx * nodeRadius;
    const y1 = fromY + ny * nodeRadius;
    const x2 = toX - nx * (nodeRadius + 5); // Small gap
    const y2 = toY - ny * (nodeRadius + 5);

    return { x1, y1, x2, y2 };
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Title */}
      <div className="title">角色關係網絡</div>

      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <div className="legend-line-secret-crush" />
          <span>暗戀關係</span>
        </div>
        <div className="legend-item">
          <div className="legend-line-bestie" />
          <span>摯友關係</span>
        </div>
        <div className="legend-item">
          <div className="legend-shape-female" />
          <span>女性</span>
        </div>
        <div className="legend-item">
          <div className="legend-shape-male" />
          <span>男性</span>
        </div>
      </div>

      {/* SVG Network */}
      <svg
        width="100vw"
        height="100vh"
        viewBox="0 0 800 700"
        style={{
          background: '#0f172a',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
      >
        <defs>
          {/* Arrow markers for relationship lines */}
          <marker
            id="arrow-secret-crush"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" className="arrow-marker-secret-crush" />
          </marker>
          <marker
            id="arrow-bestie"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" className="arrow-marker-bestie" />
          </marker>
        </defs>

        {/* Relationship Lines */}
        {relationships.map((rel, idx) => {
          const { x1, y1, x2, y2 } = getLineEndPoints(
            rel.from.x,
            rel.from.y,
            rel.to.x,
            rel.to.y
          );

          const lineClass =
            rel.type === 'secret_crush'
              ? 'relationship-line-secret-crush'
              : 'relationship-line-bestie';

          const markerId =
            rel.type === 'secret_crush' ? 'arrow-secret-crush' : 'arrow-bestie';

          // Calculate midpoint for label
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          return (
            <g key={`line-${idx}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={lineClass}
                markerEnd={`url(#${markerId})`}
              />
              {/* Relationship label */}
              <text
                x={midX}
                y={midY - 8}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {rel.label}
              </text>
            </g>
          );
        })}

        {/* Character Nodes */}
        {CHARACTERS.map((char, idx) => {
          const isCenter = char.id === 'C007';
          const isFemale = char.gender === 'female';
          const nodeClass = isCenter
            ? 'node-group center-node'
            : 'node-group';

          // Stagger animation delay for floating effect
          const animationDelay = `${idx * 0.2}s`;

          return (
            <g
              key={char.id}
              className={nodeClass}
              style={{ animationDelay }}
              onClick={() => handleNodeClick(char.id)}
              onMouseEnter={(e) => handleMouseEnter(e, char)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Node shape: circle for female, square for male */}
              {isFemale ? (
                <circle
                  cx={char.x}
                  cy={char.y}
                  r={30}
                  className="node-female"
                  stroke={char.color}
                />
              ) : (
                <rect
                  x={char.x - 30}
                  y={char.y - 30}
                  width={60}
                  height={60}
                  className="node-male"
                  stroke={char.color}
                  rx={4}
                />
              )}

              {/* Character name */}
              <text
                x={char.x}
                y={char.y + 50}
                fill="#ffffff"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {char.name}
              </text>

              {/* Character initial badge */}
              <circle
                cx={char.x + 20}
                cy={char.y - 20}
                r={12}
                fill={char.color}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={char.x + 20}
                y={char.y - 15}
                fill="#ffffff"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {char.name.charAt(0)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="tooltip-name">{tooltip.name}</div>
          <div className="tooltip-desc">{tooltip.description}</div>
        </div>
      )}
    </>
  );
}
