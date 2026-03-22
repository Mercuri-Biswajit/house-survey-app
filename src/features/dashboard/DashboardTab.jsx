/* eslint-disable no-unused-vars */
import { useMemo } from "react";
import { db, getAgeGroupFromDOB } from "../../services/db";
import { StatCard } from "../../components/common";
import { useNavigate } from "react-router-dom";

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mini-bar-row">
      <span className="mini-bar-label">{label}</span>
      <div className="mini-bar-track">
        <div
          className="mini-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="mini-bar-val">{value}</span>
    </div>
  );
}

function AlertBanner({ count, navigate }) {
  if (!count) return null;
  return (
    <div
      className="alert-banner"
      onClick={() => navigate("/alerts")}
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderLeft: "4px solid #dc2626",
        borderRadius: 10,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      <div>
        <span style={{ fontWeight: 800, color: "#dc2626", fontSize: 14 }}>
          ⚠ {count} overdue vaccination{count > 1 ? "s" : ""} detected
        </span>
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: 12 }}>
          Click to view alerts
        </span>
      </div>
      <span style={{ color: "#dc2626", fontSize: 18 }}>→</span>
    </div>
  );
}

export default function DashboardTab({
  stats,
  households,
  pregnant,
  children,
}) {
  const navigate = useNavigate();

  const vaccStats = useMemo(() => {
    const total = children.length;
    const bcg = children.filter((c) => c.BCG).length;
    const penta3 = children.filter((c) => c.Penta3).length;
    const mr1 = children.filter((c) => c.MR1).length;
    const mr2 = children.filter((c) => c.MR2).length;
    const noMcpCard = children.filter(
      (c) => !c.mcpCard && !c.mcpCardUwn,
    ).length;
    return { total, bcg, penta3, mr1, mr2, noMcpCard };
  }, [children]);

  const ancStats = useMemo(() => {
    const total = pregnant.length;
    const anc1 = pregnant.filter((p) => p.anc1).length;
    const anc2 = pregnant.filter((p) => p.anc2).length;
    const anc3 = pregnant.filter((p) => p.anc3).length;
    const anc4 = pregnant.filter((p) => p.anc4).length;
    const noMcpCard = pregnant.filter(
      (p) => !p.mcpCard && !p.mcpCardUwn,
    ).length;
    const tdComplete = pregnant.filter((p) => p.td1 && p.td2).length;
    return { total, anc1, anc2, anc3, anc4, noMcpCard, tdComplete };
  }, [pregnant]);

  const topFamilies = useMemo(
    () =>
      [...households]
        .sort((a, b) => (b.familyMembers || 0) - (a.familyMembers || 0))
        .slice(0, 8),
    [households],
  );

  const maxMem = topFamilies[0]?.familyMembers || 1;

  const totalPopulation = useMemo(
    () => households.reduce((s, h) => s + (h.familyMembers || 0), 0),
    [households],
  );

  return (
    <div className="dashboard">
      {/* Alert Banner */}
      {stats.overdueCount > 0 && (
        <AlertBanner count={stats.overdueCount} navigate={navigate} />
      )}

      {/* KPI Row */}
      <div className="stats-grid">
        <StatCard
          label="Pregnant Women"
          value={stats.totalPregnant}
          type="pink"
        />
        <StatCard label="Child < 1 Month" value={stats.countU1m} type="blue" />
        <StatCard label="Child 1M – 1Yr" value={stats.count1m1y} type="teal" />
        <StatCard label="Child 1 – 2 Yr" value={stats.count1y2y} type="blue2" />
        <StatCard
          label="Child 2 – 5 Yr"
          value={stats.totalChildren25}
          type="purple"
        />
        <StatCard
          label="Child 6 – 18 Yr"
          value={stats.totalChildren618}
          type="purple"
        />
        <StatCard
          label="Missed Vaccines"
          value={stats.missedVaccine}
          type="red"
        />
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        {[
          { label: "Total Households", value: stats.totalHouses, icon: "⌂" },
          { label: "Total Population", value: totalPopulation, icon: "👥" },
          {
            label: "No MCP Card (Children)",
            value: vaccStats.noMcpCard,
            icon: "🪪",
            warn: vaccStats.noMcpCard > 0,
          },
          {
            label: "No MCP Card (Mothers)",
            value: ancStats.noMcpCard,
            icon: "🪪",
            warn: ancStats.noMcpCard > 0,
          },
          { label: "TD Complete", value: ancStats.tdComplete, icon: "🛡" },
          {
            label: "Overdue Vaccinations",
            value: stats.overdueCount,
            icon: "⚠",
            danger: true,
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`quick-stat ${s.warn ? "quick-stat-warn" : ""} ${s.danger && s.value > 0 ? "quick-stat-danger" : ""}`}
          >
            <span className="quick-stat-icon">{s.icon}</span>
            <span className="quick-stat-value">{s.value}</span>
            <span className="quick-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-panels">
        {/* Vaccination Coverage */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Immunization Coverage</span>
            <span className="panel-tag">{vaccStats.total} Children</span>
          </div>
          <div className="panel-body">
            <MiniBar
              label="BCG"
              value={vaccStats.bcg}
              max={vaccStats.total}
              color="#16a34a"
            />
            <MiniBar
              label="Penta-3"
              value={vaccStats.penta3}
              max={vaccStats.total}
              color="#0891b2"
            />
            <MiniBar
              label="MR-1"
              value={vaccStats.mr1}
              max={vaccStats.total}
              color="#7c3aed"
            />
            <MiniBar
              label="MR-2"
              value={vaccStats.mr2}
              max={vaccStats.total}
              color="#d97706"
            />
            <div className="coverage-note">
              Out of {vaccStats.total} registered children •{" "}
              {vaccStats.noMcpCard > 0 && (
                <span style={{ color: "#dc2626" }}>
                  {vaccStats.noMcpCard} missing MCP cards
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ANC Coverage */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">ANC & TD Coverage</span>
            <span className="panel-tag">{ancStats.total} Pregnant</span>
          </div>
          <div className="panel-body">
            <MiniBar
              label="1st ANC"
              value={ancStats.anc1}
              max={ancStats.total}
              color="#be185d"
            />
            <MiniBar
              label="2nd ANC"
              value={ancStats.anc2}
              max={ancStats.total}
              color="#e11d48"
            />
            <MiniBar
              label="3rd ANC"
              value={ancStats.anc3}
              max={ancStats.total}
              color="#f43f5e"
            />
            <MiniBar
              label="4th ANC"
              value={ancStats.anc4}
              max={ancStats.total}
              color="#fb7185"
            />
            <MiniBar
              label="TD Complete"
              value={ancStats.tdComplete}
              max={ancStats.total}
              color="#0891b2"
            />
            <div className="coverage-note">
              Out of {ancStats.total} registered mothers
            </div>
          </div>
        </div>

        {/* Top Families */}
        <div className="panel panel-wide">
          <div className="panel-header">
            <span className="panel-title">Largest Households</span>
            <span className="panel-tag">By family size</span>
          </div>
          <div className="panel-body">
            {topFamilies.map((h) => (
              <div key={h.id} className="family-row">
                <span className="family-no">#{h.id}</span>
                <span className="family-name">{h.headName}</span>
                <div className="family-bar-track">
                  <div
                    className="family-bar-fill"
                    style={{ width: `${(h.familyMembers / maxMem) * 100}%` }}
                  />
                </div>
                <span className="family-count">{h.familyMembers}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Children Age Distribution */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Children Age Distribution</span>
          </div>
          <div className="panel-body">
            {[
              {
                label: "Under 1 month",
                val: households.reduce(
                  (s, h) => s + (h.childUnder1Month || 0),
                  0,
                ),
                color: "#fbbf24",
              },
              {
                label: "1 month – 1 year",
                val: households.reduce(
                  (s, h) => s + (h.child1MonthTo1Year || 0),
                  0,
                ),
                color: "#34d399",
              },
              {
                label: "1 – 2 years",
                val: households.reduce(
                  (s, h) => s + (h.child1To2Years || 0),
                  0,
                ),
                color: "#60a5fa",
              },
              {
                label: "2 – 5 years",
                val: households.reduce(
                  (s, h) => s + (h.child2To5Years || 0),
                  0,
                ),
                color: "#c084fc",
              },
              {
                label: "6 – 18 years",
                val: households.reduce(
                  (s, h) => s + (h.child6To18Years || 0),
                  0,
                ),
                color: "#a855f7",
              },
            ].map((item) => (
              <div key={item.label} className="age-row">
                <span className="age-dot" style={{ background: item.color }} />
                <span className="age-label">{item.label}</span>
                <span className="age-val">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
