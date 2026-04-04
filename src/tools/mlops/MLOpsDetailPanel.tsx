import { useState } from 'react';
import { useAppState } from '../../store/context';
import { STAGE_CATALOG, MATURITY_LEVELS, KEY_CONCEPTS, PROVIDER_OVERVIEWS, getAllServicesForStage } from './catalog';
import { classifyResourceType } from './parser';
import type { MLOpsStageType, MLOpsStageMeta } from '../types';
import type { Provider } from './catalog';

const PROVIDER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  aws: { label: 'AWS', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  gcp: { label: 'GCP', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  openstack: { label: 'OpenStack', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

type SubTab = 'learn' | 'workflow' | 'stage';

export function MLOpsDetailPanel() {
  const { state } = useAppState();
  const mlops = state.mlopsData;
  const hasWorkflow = mlops && mlops.stages.length > 0;

  // Find the MLOps stage for the selected graph node by classifying the resource type
  let selectedStage: MLOpsStageMeta | null = null;
  if (state.selectedNodeId && hasWorkflow) {
    const selectedBlock = state.graph.blocks.find(b => b.id === state.selectedNodeId);
    if (selectedBlock?.type) {
      const stageType = classifyResourceType(selectedBlock.type);
      if (stageType) {
        selectedStage = mlops.stages.find(s => s.type === stageType) ?? null;
      }
    }
  }

  // Auto-switch to stage view when a node is selected
  const [manualTab, setManualTab] = useState<SubTab>('learn');
  const activeSubTab: SubTab = selectedStage ? 'stage' : manualTab === 'stage' ? 'workflow' : manualTab;

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'learn', label: 'Learn' },
    { id: 'workflow', label: 'Pipeline' },
  ];
  if (selectedStage) {
    subTabs.push({ id: 'stage', label: 'Stage' });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex border-b border-slate-700/50 shrink-0 bg-slate-800/50">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setManualTab(t.id)}
            className={`flex-1 text-[11px] py-1.5 px-2 font-medium transition-colors ${
              activeSubTab === t.id
                ? 'text-blue-400 border-b border-blue-400'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeSubTab === 'learn' && <LearnTab currentProvider={mlops?.provider} />}
        {activeSubTab === 'workflow' && <WorkflowTab />}
        {activeSubTab === 'stage' && selectedStage && (
          <StageTab stage={selectedStage} provider={mlops?.provider ?? 'aws'} />
        )}
      </div>
    </div>
  );
}

// ── Learn Tab ────────────────────────────────────────────────────

function LearnTab({ currentProvider }: { currentProvider?: string }) {
  const [expandedSection, setExpandedSection] = useState<string | null>('what-is-mlops');

  const toggle = (id: string) => setExpandedSection(prev => prev === id ? null : id);

  return (
    <div className="p-3 space-y-2">
      {/* What is MLOps */}
      <CollapsibleSection
        id="what-is-mlops"
        title="What is MLOps?"
        icon="🎯"
        expanded={expandedSection === 'what-is-mlops'}
        onToggle={toggle}
      >
        <p className="text-xs text-slate-300 leading-relaxed">
          MLOps (Machine Learning Operations) is a set of practices that combines ML, DevOps, and data
          engineering to deploy and maintain ML systems in production <span className="text-slate-500">reliably and efficiently</span>.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed mt-2">
          Think of it as DevOps for ML: just as DevOps automated software delivery,
          MLOps automates the ML lifecycle — from data ingestion through model training,
          deployment, and monitoring.
        </p>
        <div className="mt-2 p-2 rounded bg-blue-500/5 border border-blue-500/20">
          <div className="text-[10px] text-blue-400 font-medium mb-1">Key Difference from DevOps</div>
          <div className="text-[11px] text-slate-400">
            Software is deterministic — same code, same behavior. ML is probabilistic — same code + different data = different model.
            MLOps must manage <span className="text-slate-300">code, data, and models</span> as first-class versioned artifacts.
          </div>
        </div>
      </CollapsibleSection>

      {/* Maturity Levels */}
      <CollapsibleSection
        id="maturity"
        title="MLOps Maturity Levels"
        icon="📈"
        expanded={expandedSection === 'maturity'}
        onToggle={toggle}
      >
        <div className="space-y-3">
          {MATURITY_LEVELS.map(level => (
            <div key={level.level} className="bg-slate-800 rounded p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  level.level === 0 ? 'bg-slate-600/50 text-slate-300' :
                  level.level === 1 ? 'bg-blue-500/20 text-blue-300' :
                  'bg-emerald-500/20 text-emerald-300'
                }`}>
                  Level {level.level}
                </span>
                <span className="text-xs font-medium text-slate-200">{level.name}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{level.description}</p>
              <ul className="space-y-0.5">
                {level.characteristics.map((c, i) => (
                  <li key={i} className="text-[11px] text-slate-500 flex gap-1.5">
                    <span className={`shrink-0 ${
                      level.level === 0 ? 'text-slate-600' :
                      level.level === 1 ? 'text-blue-600' :
                      'text-emerald-600'
                    }`}>-</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Key Concepts */}
      <CollapsibleSection
        id="concepts"
        title="Key Concepts"
        icon="💡"
        expanded={expandedSection === 'concepts'}
        onToggle={toggle}
      >
        <div className="space-y-2">
          {KEY_CONCEPTS.map(concept => (
            <div key={concept.term} className="bg-slate-800 rounded p-2.5">
              <div className="text-xs font-medium text-slate-200 mb-1">{concept.term}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{concept.definition}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {concept.relatedStages.map(s => (
                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-500">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Provider Comparison */}
      <CollapsibleSection
        id="providers"
        title="Cloud Provider Comparison"
        icon="☁️"
        expanded={expandedSection === 'providers'}
        onToggle={toggle}
      >
        <div className="space-y-3">
          {PROVIDER_OVERVIEWS.map(prov => {
            const style = PROVIDER_LABELS[prov.provider];
            const isCurrent = prov.provider === currentProvider;
            return (
              <div key={prov.provider} className={`rounded p-2.5 border ${
                isCurrent ? style?.bg ?? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-slate-700/50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${style?.color ?? 'text-slate-300'}`}>
                    {prov.label}
                  </span>
                  <span className="text-[10px] text-slate-600">({prov.mlPlatform})</span>
                  {isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">current</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1.5 mb-1">Strengths</div>
                <ul className="space-y-0.5">
                  {prov.strengths.map((s, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex gap-1.5">
                      <span className="text-emerald-600 shrink-0">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 mb-1">Considerations</div>
                <ul className="space-y-0.5">
                  {prov.considerations.map((c, i) => (
                    <li key={i} className="text-[11px] text-slate-500 flex gap-1.5">
                      <span className="text-amber-600 shrink-0">!</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Stage Encyclopedia */}
      <CollapsibleSection
        id="stages"
        title="Stage Encyclopedia"
        icon="📖"
        expanded={expandedSection === 'stages'}
        onToggle={toggle}
      >
        <p className="text-[11px] text-slate-500 mb-2">
          All MLOps pipeline stages and what they do. Click a node in the graph for deep-dive details.
        </p>
        <div className="space-y-1.5">
          {(Object.entries(STAGE_CATALOG) as [MLOpsStageType, typeof STAGE_CATALOG[MLOpsStageType]][]).map(([type, info]) => (
            <div key={type} className="bg-slate-800 rounded p-2">
              <div className="text-[11px] font-medium text-slate-300">{type.replace(/_/g, ' ')}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{info.description}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ── Workflow Tab ──────────────────────────────────────────────────

function WorkflowTab() {
  const { state } = useAppState();
  const mlops = state.mlopsData;

  if (!mlops || mlops.stages.length === 0) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-center">
          <div className="text-2xl mb-2">🔧</div>
          <div className="text-sm text-slate-300 font-medium">Build Your MLOps Pipeline</div>
          <div className="text-xs text-slate-500 mt-1">
            Define a workflow in JSON or pick a preset from the top bar to get started.
          </div>
        </div>
        <div className="p-2.5 rounded bg-slate-800 border border-slate-700">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Quick Start</div>
          <ol className="space-y-1.5 text-[11px] text-slate-400">
            <li className="flex gap-2"><span className="text-blue-500 font-medium shrink-0">1.</span> Click a preset button above (e.g., "Basic Training")</li>
            <li className="flex gap-2"><span className="text-blue-500 font-medium shrink-0">2.</span> Explore the graph — each node is a pipeline stage</li>
            <li className="flex gap-2"><span className="text-blue-500 font-medium shrink-0">3.</span> Click any node to learn what it does and why</li>
            <li className="flex gap-2"><span className="text-blue-500 font-medium shrink-0">4.</span> Edit the JSON to customize stages and connections</li>
          </ol>
        </div>
        <div className="p-2.5 rounded bg-slate-800 border border-slate-700">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">JSON Schema</div>
          <pre className="text-[10px] text-slate-500 leading-relaxed overflow-x-auto">{`{
  "name": "My Pipeline",
  "provider": "aws | gcp | openstack",
  "stages": [
    {
      "id": "unique_id",
      "name": "Display Name",
      "type": "model_training",
      "service": "optional override",
      "connections": ["next_stage_id"]
    }
  ]
}`}</pre>
        </div>
      </div>
    );
  }

  const prov = PROVIDER_LABELS[mlops.provider] ?? { label: mlops.provider, color: 'text-slate-400', bg: '' };

  return (
    <div className="p-3 space-y-3">
      {/* Workflow header */}
      <div className="bg-slate-800 rounded p-3">
        <div className="text-sm font-medium text-slate-200">{mlops.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] px-2 py-0.5 rounded border ${prov.bg}`}>
            <span className={prov.color}>{prov.label}</span>
          </span>
          <span className="text-[11px] text-slate-500">{mlops.stages.length} stages</span>
        </div>
      </div>

      {/* Recommendations */}
      {mlops.recommendations.length > 0 && (
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Recommendations</div>
          <div className="space-y-1.5">
            {mlops.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`text-[11px] px-2.5 py-2 rounded border ${
                  rec.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                {rec.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage list */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
          Stages <span className="text-slate-600">(click a node for deep dive)</span>
        </div>
        <div className="space-y-1.5">
          {mlops.stages.map(stage => (
            <div key={stage.id} className="bg-slate-800 rounded p-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200">{stage.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{stage.service}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-500 shrink-0">
                  {stage.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{stage.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stage Deep Dive Tab ──────────────────────────────────────────

function StageTab({ stage, provider }: { stage: MLOpsStageMeta; provider: string }) {
  const provLabel = PROVIDER_LABELS[provider] ?? { label: provider, color: 'text-slate-400', bg: '' };
  const allServices = getAllServicesForStage(stage.type);

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="bg-slate-800 rounded p-3">
        <div className="text-sm font-medium text-slate-200">{stage.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] ${provLabel.color}`}>{stage.service}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-500">
            {stage.type.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* What it does */}
      <InfoCard title="What It Does" icon="📘">
        <p className="text-[11px] text-slate-300 leading-relaxed">{stage.description}</p>
      </InfoCard>

      {/* Why it matters */}
      {stage.whyItMatters && (
        <InfoCard title="Why It Matters" icon="🎯">
          <p className="text-[11px] text-slate-300 leading-relaxed">{stage.whyItMatters}</p>
        </InfoCard>
      )}

      {/* Provider-specific notes */}
      {stage.providerNotes && (
        <InfoCard title={`${provLabel.label} Implementation`} icon="☁️">
          <div className={`text-[11px] text-slate-300 leading-relaxed p-2 rounded border ${provLabel.bg}`}>
            {stage.providerNotes}
          </div>
        </InfoCard>
      )}

      {/* Cross-provider comparison */}
      <InfoCard title="Across Providers" icon="🔄">
        <div className="space-y-1.5">
          {(['aws', 'gcp', 'openstack'] as Provider[]).map(p => {
            const svc = allServices[p];
            const style = PROVIDER_LABELS[p];
            const isCurrent = p === provider;
            return (
              <div key={p} className={`text-[11px] p-2 rounded ${
                isCurrent ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-800'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`font-medium ${style?.color ?? 'text-slate-400'}`}>{style?.label ?? p}</span>
                  {isCurrent && <span className="text-[9px] text-blue-400">(current)</span>}
                </div>
                <div className="text-slate-400 mt-0.5">{svc.service}</div>
                <div className="text-slate-500 mt-0.5">{svc.notes}</div>
              </div>
            );
          })}
        </div>
      </InfoCard>

      {/* Common Pitfalls */}
      {stage.commonPitfalls.length > 0 && (
        <InfoCard title="Common Pitfalls" icon="⚠️">
          <ul className="space-y-1">
            {stage.commonPitfalls.map((pitfall, i) => (
              <li key={i} className="text-[11px] text-amber-300/80 flex gap-1.5">
                <span className="text-amber-600 shrink-0">!</span>
                <span>{pitfall}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}

      {/* Best Practices */}
      {stage.bestPractices.length > 0 && (
        <InfoCard title="Best Practices" icon="✅">
          <ul className="space-y-1">
            {stage.bestPractices.map((tip, i) => (
              <li key={i} className="text-[11px] text-slate-400 flex gap-1.5">
                <span className="text-emerald-500 shrink-0">-</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      )}
    </div>
  );
}

// ── Reusable Components ──────────────────────────────────────────

function CollapsibleSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium text-slate-300 flex-1">{title}</span>
        <span className="text-slate-600 text-xs">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2.5 bg-slate-900/50">
          {children}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-700/50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50">
        <span className="text-xs">{icon}</span>
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-2.5 py-2">
        {children}
      </div>
    </div>
  );
}
