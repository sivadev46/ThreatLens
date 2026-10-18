import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Play,
  Plus,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { useToast } from '../components/common/NotificationToast';
import { DetectionRule, AlertSeverity, EventType } from '../types/security';

export const DetectionRulesPage: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<DetectionRule[]>([]);

  // Edit threshold state
  const [editingRule, setEditingRule] = useState<DetectionRule | null>(null);
  const [thresholdValue, setThresholdValue] = useState<number>(5);
  const [windowSeconds, setWindowSeconds] = useState<number>(60);
  const [ruleSeverity, setRuleSeverity] = useState<AlertSeverity>('HIGH');

  // Dry run testing state
  const [testingRule, setTestingRule] = useState<DetectionRule | null>(null);
  const [testResult, setTestResult] = useState<{ matches: number; simulatedAlerts: number; details: string[] } | null>(null);

  // Technical logic / Architecture modal
  const [explainingRule, setExplainingRule] = useState<DetectionRule | null>(null);

  // Create Custom Rule state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('RULE_');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventType, setNewEventType] = useState<EventType | 'ALL'>('HTTP_REQUEST');
  const [newThreshold, setNewThreshold] = useState<number>(20);
  const [newWindow, setNewWindow] = useState<number>(30);
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('MEDIUM');
  const [createError, setCreateError] = useState('');

  // Delete rule target
  const [deleteTarget, setDeleteTarget] = useState<DetectionRule | null>(null);

  const refreshRules = () => setRules(securityService.getRules());

  useEffect(() => {
    refreshRules();
    return securityService.subscribe(refreshRules);
  }, []);

  const handleToggle = (rule: DetectionRule) => {
    const success = securityService.toggleRule(rule.id);
    if (success) {
      showToast({
        type: 'info',
        title: 'Rule Status Changed',
        message: `${rule.name} is now ${rule.enabled ? 'disabled' : 'enabled'}.`,
      });
    }
  };

  const handleOpenEdit = (rule: DetectionRule) => {
    setEditingRule(rule);
    setThresholdValue(rule.thresholdValue);
    setWindowSeconds(rule.timeWindowSeconds);
    setRuleSeverity(rule.severity);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (thresholdValue <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Threshold',
        message: 'Threshold value must be greater than zero.',
      });
      return;
    }

    const success = securityService.updateRuleParameters(editingRule.id, {
      thresholdValue,
      timeWindowSeconds: windowSeconds,
      severity: ruleSeverity,
    });

    if (success) {
      showToast({
        type: 'success',
        title: 'Rule Parameters Saved',
        message: `Updated ${editingRule.code} threshold to ${thresholdValue} events in ${windowSeconds}s.`,
      });
      setEditingRule(null);
    }
  };

  const handleRunDryRun = (rule: DetectionRule) => {
    setTestingRule(rule);
    const result = securityService.testRuleDryRun(rule.id);
    setTestResult(result);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newCode.trim().startsWith('RULE_')) {
      setCreateError('Rule code must start with RULE_ (e.g. RULE_ADMIN_BURST)');
      return;
    }

    if (!newName.trim() || !newDescription.trim()) {
      setCreateError('Please provide both rule name and descriptive explanation.');
      return;
    }

    const res = securityService.addCustomRule({
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      description: newDescription.trim(),
      severity: newSeverity,
      enabled: true,
      thresholdValue: newThreshold,
      timeWindowSeconds: newWindow,
      targetEventType: newEventType,
      triggerConditionExplanation: `Triggers when ${newThreshold} ${newEventType} events occur within ${newWindow}s sliding window.`,
    });

    if (!res.success) {
      setCreateError(res.error || 'Failed to create detection rule.');
      return;
    }

    showToast({
      type: 'success',
      title: 'Custom Rule Created',
      message: `${newCode} is now active in the correlation pipeline.`,
    });

    setShowCreateModal(false);
    setNewCode('RULE_');
    setNewName('');
    setNewDescription('');
  };

  const handleDeleteRule = () => {
    if (!deleteTarget) return;
    const res = securityService.deleteRule(deleteTarget.id);
    if (!res.success) {
      showToast({
        type: 'error',
        title: 'Cannot Delete Rule',
        message: res.error || 'Operation disallowed.',
      });
    } else {
      showToast({
        type: 'warning',
        title: 'Rule Deleted',
        message: `Deleted custom rule ${deleteTarget.code}.`,
      });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Detection Rules
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure correlation thresholds and temporal sliding windows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
          >
            Create Rule
          </Button>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0c121e] px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span>Active Rules:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {rules.filter((r) => r.enabled).length} / {rules.length}
            </span>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 gap-4">
        {rules.map((rule) => {
          const isCoreRule = ['RULE_BRUTE_FORCE', 'RULE_REQUEST_BURST', 'RULE_BLOCKLIST_IP'].includes(rule.code);

          return (
            <div
              key={rule.id}
              className={`p-5 rounded-xl border transition-all ${
                rule.enabled
                  ? 'border-slate-800/80 bg-[#0c121e]'
                  : 'border-slate-800/40 bg-[#080d17]/80 opacity-75'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-blue-400 font-bold tracking-wider">
                      {rule.code}
                    </span>
                    <Badge label={rule.severity} variant="severity" severity={rule.severity} size="sm" />
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        rule.enabled
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {rule.enabled ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ACTIVE
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-500" /> DISABLED
                        </>
                      )}
                    </span>
                    {isCoreRule && (
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        CORE
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100">{rule.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {rule.description}
                  </p>

                  {/* Technical trigger condition box */}
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 max-w-2xl font-mono text-[11px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 font-sans font-semibold text-[10px] uppercase">
                        Correlation Heuristic
                      </span>
                      <button
                        onClick={() => setExplainingRule(rule)}
                        className="text-blue-400 hover:text-blue-300 font-sans text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>View Specs</span>
                      </button>
                    </div>
                    <code className="text-amber-300 text-xs">{rule.triggerConditionExplanation}</code>
                  </div>
                </div>

                {/* Action & Parameters Panel */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-left md:text-right font-mono text-xs">
                    <div className="text-slate-400">
                      Threshold:{' '}
                      <span className="text-slate-100 font-bold">{rule.thresholdValue}</span>
                      {rule.timeWindowSeconds > 0 && ` in ${rule.timeWindowSeconds}s`}
                    </div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      Triggers: <span className="text-slate-300 font-semibold">{rule.totalTriggerCount}</span>
                    </div>
                    {rule.lastTriggered && (
                      <div className="text-slate-500 text-[10px]">
                        Last: {rule.lastTriggered.substring(11, 19)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Play className="w-3 h-3" />}
                      onClick={() => handleRunDryRun(rule)}
                      title="Test heuristic against current log buffer"
                    >
                      Dry Run
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Edit2 className="w-3 h-3" />}
                      onClick={() => handleOpenEdit(rule)}
                    >
                      Calibrate
                    </Button>

                    <Button
                      size="sm"
                      variant={rule.enabled ? 'secondary' : 'primary'}
                      onClick={() => handleToggle(rule)}
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </Button>

                    {!isCoreRule && (
                      <button
                        onClick={() => setDeleteTarget(rule)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Delete custom rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog 1: Calibrate Sensitivity */}
      <Dialog
        isOpen={!!editingRule}
        onClose={() => setEditingRule(null)}
        title={`Calibrate Parameters: ${editingRule?.code}`}
        description={editingRule?.name}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingRule(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Save Calibration
            </Button>
          </>
        }
      >
        {editingRule && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Threshold Count (Events)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Number of matched events required before alert correlation fires.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Rolling Time Window (Seconds)
              </label>
              <input
                type="number"
                min="0"
                max="3600"
                value={windowSeconds}
                onChange={(e) => setWindowSeconds(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Sliding evaluation window in seconds (0 = immediate single event match).
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Triggered Alert Severity
              </label>
              <select
                value={ruleSeverity}
                onChange={(e) => setRuleSeverity(e.target.value as AlertSeverity)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </form>
        )}
      </Dialog>

      {/* Dialog 2: Dry Run Evaluation Results */}
      <Dialog
        isOpen={!!testingRule}
        onClose={() => {
          setTestingRule(null);
          setTestResult(null);
        }}
        title={`Dry Run Evaluation: ${testingRule?.code}`}
        description="Offline correlation simulation against current in-memory log buffer."
        maxWidth="lg"
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTestingRule(null);
              setTestResult(null);
            }}
          >
            Close
          </Button>
        }
      >
        {testingRule && testResult && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Total Log Matches</span>
                <p className="font-mono text-slate-100 font-bold text-sm mt-0.5">
                  {testResult.matches} events
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-mono text-[10px]">Simulated Alerts Triggered</span>
                <p className="font-mono text-rose-400 font-bold text-sm mt-0.5">
                  {testResult.simulatedAlerts} incidents
                </p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-2">
                Simulated Correlation Breakdown
              </span>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 font-mono text-[11px] space-y-1.5 max-h-60 overflow-y-auto">
                {testResult.details.map((detail, idx) => (
                  <div key={idx} className="text-slate-300">
                    &bull; {detail}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog 3: Architecture Specs */}
      <Dialog
        isOpen={!!explainingRule}
        onClose={() => setExplainingRule(null)}
        title={`Correlation Specs: ${explainingRule?.code}`}
        description="Sliding-window algorithm and query logic."
        maxWidth="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setExplainingRule(null)}>
            Close
          </Button>
        }
      >
        {explainingRule && (
          <div className="space-y-4 text-xs leading-relaxed">
            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-blue-300">
              <h4 className="font-semibold text-blue-200 mb-1">
                Sliding-Window Correlation Principle
              </h4>
              <p className="text-[11px] text-slate-300">
                Events are evaluated over a rolling window where each new log event looks back exactly <span className="font-mono text-amber-300 font-bold">{explainingRule.timeWindowSeconds}s</span> from its own timestamp.
              </p>
            </div>

            <div>
              <h4 className="text-slate-200 font-semibold mb-1">
                Java Sliding-Window Implementation
              </h4>
              <pre className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`Map<String, Deque<Long>> ipEventWindows = new ConcurrentHashMap<>();

public boolean evaluate(LogEntry entry) {
    long now = entry.getTimestampMillis();
    long windowCutoff = now - (${explainingRule.timeWindowSeconds} * 1000L);
    Deque<Long> window = ipEventWindows.computeIfAbsent(entry.getSourceIp(), k -> new ArrayDeque<>());
    synchronized(window) {
        while (!window.isEmpty() && window.peekFirst() < windowCutoff) {
            window.pollFirst();
        }
        window.addLast(now);
        return window.size() >= ${explainingRule.thresholdValue};
    }
}`}
              </pre>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog 4: Create Custom Rule */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Detection Rule"
        description="Define a new correlation heuristic."
        maxWidth="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateSubmit}>
              Create Rule
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Rule Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. RULE_ADMIN_ENDPOINT_SCAN"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Severity Level
              </label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Rule Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rapid Admin Portal Access Burst"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Describe the intrusion pattern..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Event Type</label>
              <select
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value as any)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              >
                <option value="ALL">ALL Events</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="HTTP_REQUEST">HTTP_REQUEST</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Threshold</label>
              <input
                type="number"
                min="1"
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Window (Seconds)</label>
              <input
                type="number"
                min="1"
                value={newWindow}
                onChange={(e) => setNewWindow(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#090e18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          {createError && <p className="text-rose-400 text-xs">{createError}</p>}
        </form>
      </Dialog>

      {/* Dialog 5: Delete Custom Rule */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Rule"
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteRule}>
              Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-xs text-slate-300">
            Permanently delete rule <span className="font-mono font-bold text-rose-400">{deleteTarget.code}</span> ({deleteTarget.name})?
          </p>
        )}
      </Dialog>
    </div>
  );
};
