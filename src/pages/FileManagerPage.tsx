import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderArchive,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Eye,
  HardDrive,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import { securityService } from '../services/securityService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { EmptyState } from '../components/common/StateViews';
import { useToast } from '../components/common/NotificationToast';
import { UploadedFileRecord, FileImportStatus } from '../types/security';

export const FileManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [files, setFiles] = useState<UploadedFileRecord[]>([]);
  const [summary, setSummary] = useState({
    totalFiles: 0,
    successfullyProcessed: 0,
    failedImports: 0,
    totalEventsImported: 0,
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);

  // Detail Modal / Drawer
  const [selectedFile, setSelectedFile] = useState<UploadedFileRecord | null>(null);

  // Delete / Archive Modal
  const [fileToDelete, setFileToDelete] = useState<UploadedFileRecord | null>(null);
  const [deleteEvidenceWarning, setDeleteEvidenceWarning] = useState<string | null>(null);

  // Refresh files
  const refreshData = () => {
    const list = securityService.getUploadedFiles();
    setFiles(list);
    setSummary(securityService.getFilesSummary());

    if (selectedFile) {
      const updated = securityService.getUploadedFileById(selectedFile.id);
      setSelectedFile(updated || null);
    }
  };

  useEffect(() => {
    refreshData();
    return securityService.subscribe(refreshData);
  }, [selectedFile?.id]);

  // Format bytes
  const formatSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Status Badge Helper
  const renderStatusBadge = (status: FileImportStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 dark:border-emerald-500/25 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Completed
          </span>
        );
      case 'Completed with Errors':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border dark:bg-amber-500/10 bg-amber-50 dark:text-amber-400 text-amber-700 dark:border-amber-500/25 border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Errors Detected
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border dark:bg-rose-500/10 bg-rose-50 dark:text-rose-400 text-rose-700 dark:border-rose-500/25 border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            Failed
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border dark:bg-slate-800/60 bg-slate-100 dark:text-slate-400 text-slate-600 dark:border-slate-700 border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            Archived
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border dark:bg-sky-500/10 bg-sky-50 dark:text-sky-400 text-sky-700 dark:border-sky-500/25 border-sky-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            Processing...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Filtered files list
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.fileType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || f.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle file ingestion
  const handleFileUpload = async (fileList: FileList | File[]) => {
    const uploadFiles = Array.from(fileList);
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);

    let totalParsed = 0;
    let totalErrors = 0;
    let newAlerts = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const text = await file.text();
      setUploadProgress(Math.round(((i + 0.5) / uploadFiles.length) * 85));

      const res = securityService.importLogContent(text, file.name, file.size);
      totalParsed += res.parsedCount;
      totalErrors += res.errorCount;
      newAlerts += res.newAlertsGenerated;
    }

    setUploadProgress(100);
    setTimeout(() => {
      setIsUploading(false);
      setUploadProgress(0);
      refreshData();

      showToast({
        type: totalErrors > 0 ? 'warning' : 'success',
        title: 'File Ingestion Complete',
        message: `Imported ${uploadFiles.length} file(s). Parsed ${totalParsed} events, ${totalErrors} rejected line(s). Generated ${newAlerts} alert(s).`,
      });
    }, 400);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Trigger file deletion modal with safety check
  const confirmDeleteFile = (file: UploadedFileRecord) => {
    const alerts = securityService.getAlerts();
    const fileLogIds = new Set(securityService.getFileLogs(file.fileName).map((l) => l.id));
    const activeAlerts = alerts.filter(
      (a) => a.status !== 'RESOLVED' && a.evidenceLogIds?.some((id) => fileLogIds.has(id))
    );

    if (activeAlerts.length > 0) {
      setDeleteEvidenceWarning(
        `Warning: This file contains evidence logs tied to ${activeAlerts.length} active security alert(s). Complete deletion is restricted to preserve forensic integrity. Archiving will hide the file from active lists while preserving critical incident evidence.`
      );
    } else {
      setDeleteEvidenceWarning(null);
    }

    setFileToDelete(file);
  };

  // Execute safe deletion / archive
  const executeDelete = () => {
    if (!fileToDelete) return;
    const res = securityService.deleteUploadedFile(fileToDelete.id);
    setFileToDelete(null);
    setDeleteEvidenceWarning(null);
    if (selectedFile?.id === fileToDelete.id) {
      setSelectedFile(null);
    }

    showToast({
      type: res.status === 'Archived' ? 'warning' : 'info',
      title: res.status === 'Archived' ? 'File Archived' : 'File Removed',
      message: res.message,
    });
    refreshData();
  };

  // Reprocess a file
  const handleReprocess = (fileId: string) => {
    const res = securityService.reprocessUploadedFile(fileId);
    if (res.success && res.result) {
      showToast({
        type: res.result.errorCount > 0 ? 'warning' : 'success',
        title: 'Reprocessing Complete',
        message: `Reprocessed ${res.result.fileName}: ${res.result.parsedCount} valid records, ${res.result.errorCount} rejected.`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Reprocessing Failed',
        message: res.message,
      });
    }
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".log,.txt,.json,.csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold dark:text-slate-100 text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderArchive className="w-5 h-5 text-sky-400" />
            File Manager
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Manage imported log files.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUploadZone(!showUploadZone)}
            className="text-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            {showUploadZone ? 'Hide Dropzone' : 'Upload Zone'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <Card className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500">
                Total Files
              </p>
              <h3 className="text-2xl font-bold dark:text-slate-100 text-slate-900 mt-1">
                {summary.totalFiles}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Successfully Processed */}
        <Card className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500">
                Successfully Processed
              </p>
              <h3 className="text-2xl font-bold dark:text-emerald-400 text-emerald-600 mt-1">
                {summary.successfullyProcessed}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Failed Imports */}
        <Card className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500">
                Failed Imports
              </p>
              <h3 className="text-2xl font-bold dark:text-rose-400 text-rose-600 mt-1">
                {summary.failedImports}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Events Imported */}
        <Card className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-400 text-slate-500">
                Total Events Imported
              </p>
              <h3 className="text-2xl font-bold dark:text-sky-400 text-sky-600 mt-1">
                {summary.totalEventsImported.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Drag-and-Drop Ingestion Area */}
      {(showUploadZone || isUploading) && (
        <Card className="p-5 border-dashed border-2 dark:border-sky-500/30 border-sky-400/40 bg-sky-500/[0.02]">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'bg-sky-500/10 border-sky-500'
                : 'hover:bg-sky-500/[0.04]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-10 h-10 mx-auto text-sky-400 mb-2 animate-bounce" />
            <h4 className="text-sm font-semibold dark:text-slate-200 text-slate-800">
              Drop log files here or click to browse
            </h4>
            <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">
              Supports standard auth logs, perimeter logs, Apache/Nginx web logs, or JSON (.log, .txt, .json, .csv)
            </p>

            {isUploading && (
              <div className="mt-4 max-w-xs mx-auto">
                <div className="flex justify-between text-[11px] dark:text-slate-400 text-slate-500 mb-1">
                  <span>Processing log signatures...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
            <input
              type="text"
              placeholder="Search by file name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs dark:bg-[#070b13] bg-white border dark:border-slate-800 border-slate-200 rounded-lg dark:text-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
            {['ALL', 'Completed', 'Completed with Errors', 'Failed', 'Archived'].map((status) => {
              const count =
                status === 'ALL'
                  ? files.length
                  : files.filter((f) => f.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'dark:text-slate-400 text-slate-600 hover:dark:bg-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {status === 'ALL' ? 'All Files' : status}
                  <span className="ml-1.5 text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Files Table */}
      <Card className="overflow-hidden">
        {filteredFiles.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No imported files match your search"
              description="Upload a log file or adjust your status and search filters above."
              actionText="Upload Files"
              onAction={() => fileInputRef.current?.click()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="dark:bg-[#070b13] bg-slate-50/80 border-b dark:border-slate-800 border-slate-200 text-[11px] uppercase tracking-wider dark:text-slate-400 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">File Name</th>
                  <th className="py-3 px-3 font-semibold">Type</th>
                  <th className="py-3 px-3 font-semibold">Upload Date</th>
                  <th className="py-3 px-3 font-semibold">Size</th>
                  <th className="py-3 px-3 font-semibold">Import Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Parsed Entries</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/80 divide-slate-100">
                {filteredFiles.map((file) => {
                  const hasErrors = file.rejectedEntries > 0;
                  return (
                    <tr
                      key={file.id}
                      className="dark:hover:bg-slate-800/40 hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                            <FileCode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium dark:text-slate-100 text-slate-900 flex items-center gap-1.5">
                              {file.fileName}
                              {file.isSystemSample && (
                                <span className="text-[10px] bg-slate-500/15 text-slate-400 px-1.5 py-0.2 rounded font-normal">
                                  Sample
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] dark:text-slate-500 text-slate-400 font-mono">
                              ID: {file.id.substring(0, 16)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* File Type */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] uppercase dark:text-slate-300 text-slate-700 bg-slate-500/10 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {file.fileType}
                        </span>
                      </td>

                      {/* Upload Date */}
                      <td className="py-3 px-3 dark:text-slate-400 text-slate-500">
                        {file.uploadDate}
                      </td>

                      {/* File Size */}
                      <td className="py-3 px-3 font-mono dark:text-slate-300 text-slate-700">
                        {file.fileSizeFormatted || formatSize(file.fileSizeBytes)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {renderStatusBadge(file.status)}
                      </td>

                      {/* Parsed Entries */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-medium dark:text-slate-100 text-slate-900">
                          {file.parsedEntries.toLocaleString()} entries
                        </div>
                        {hasErrors && (
                          <div className="text-[10px] text-amber-500 flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {file.rejectedEntries} rejected line(s)
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            title="View File Details"
                            onClick={() => setSelectedFile(file)}
                            className="p-1.5 rounded-md dark:text-slate-400 text-slate-500 hover:dark:text-sky-400 hover:text-sky-600 hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* View Logs */}
                          <button
                            title="View Imported Logs in Explorer"
                            onClick={() => navigate(`/logs?source=${encodeURIComponent(file.fileName)}`)}
                            className="p-1.5 rounded-md dark:text-slate-400 text-slate-500 hover:dark:text-emerald-400 hover:text-emerald-600 hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Reprocess */}
                          <button
                            title="Reprocess File"
                            onClick={() => handleReprocess(file.id)}
                            className="p-1.5 rounded-md dark:text-slate-400 text-slate-500 hover:dark:text-indigo-400 hover:text-indigo-600 hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Safe Delete / Archive */}
                          <button
                            title="Remove or Archive File"
                            onClick={() => confirmDeleteFile(file)}
                            className="p-1.5 rounded-md dark:text-slate-400 text-slate-500 hover:dark:text-rose-400 hover:text-rose-600 hover:dark:bg-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* File Details Drawer / Modal */}
      {selectedFile && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedFile(null)}
          title={`File Details: ${selectedFile.fileName}`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg dark:bg-[#070b13] bg-slate-50 border dark:border-slate-800 border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-semibold dark:text-slate-500 text-slate-400">
                  Status
                </span>
                <div className="mt-1">{renderStatusBadge(selectedFile.status)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold dark:text-slate-500 text-slate-400">
                  Total Lines
                </span>
                <div className="mt-1 font-mono font-bold dark:text-slate-200 text-slate-800">
                  {selectedFile.totalLines} lines
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold dark:text-slate-500 text-slate-400">
                  Parsed Records
                </span>
                <div className="mt-1 font-mono font-bold text-emerald-500">
                  {selectedFile.parsedEntries} records
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold dark:text-slate-500 text-slate-400">
                  Rejected / Malformed
                </span>
                <div className="mt-1 font-mono font-bold text-rose-500">
                  {selectedFile.rejectedEntries} lines
                </div>
              </div>
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-2 gap-3 text-[11px] dark:text-slate-400 text-slate-600">
              <div>
                <span className="font-semibold dark:text-slate-300 text-slate-700">Internal File ID:</span>{' '}
                <span className="font-mono">{selectedFile.id}</span>
              </div>
              <div>
                <span className="font-semibold dark:text-slate-300 text-slate-700">Uploaded At:</span>{' '}
                <span>{selectedFile.uploadDate}</span>
              </div>
              <div>
                <span className="font-semibold dark:text-slate-300 text-slate-700">File Size:</span>{' '}
                <span className="font-mono">{selectedFile.fileSizeFormatted || formatSize(selectedFile.fileSizeBytes)}</span>
              </div>
              <div>
                <span className="font-semibold dark:text-slate-300 text-slate-700">Format:</span>{' '}
                <span className="uppercase font-mono">{selectedFile.fileType}</span>
              </div>
            </div>

            {/* Malformed lines breakdown if present */}
            {selectedFile.malformedLines && selectedFile.malformedLines.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Malformed or Rejected Lines ({selectedFile.malformedLines.length})</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded border dark:border-slate-800 border-slate-200 divide-y dark:divide-slate-800 divide-slate-100 font-mono text-[11px]">
                  {selectedFile.malformedLines.map((m, idx) => (
                    <div key={idx} className="p-2 dark:bg-rose-500/5 bg-rose-50/40">
                      <div className="flex justify-between text-rose-500 font-semibold mb-0.5">
                        <span>Line {m.line}</span>
                        <span>{m.error}</span>
                      </div>
                      <div className="dark:text-slate-400 text-slate-600 truncate">
                        {m.raw}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw content preview if present */}
            {selectedFile.rawContent && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider">
                  <span>File Content Snippet</span>
                  <span className="font-normal font-mono lowercase">first lines</span>
                </div>
                <pre className="p-3 rounded-lg dark:bg-[#070b13] bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre leading-relaxed border dark:border-slate-800 border-slate-700">
                  {selectedFile.rawContent}
                </pre>
              </div>
            )}

            {/* Footer action buttons */}
            <div className="pt-3 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDeleteFile(selectedFile)}
                className="text-rose-500 hover:text-rose-600 hover:dark:bg-rose-500/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove or Archive
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReprocess(selectedFile.id)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reprocess File
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    navigate(`/logs?source=${encodeURIComponent(selectedFile.fileName)}`);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  View in Log Explorer
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Confirmation Modal for Safe Deletion / Archive */}
      {fileToDelete && (
        <Dialog
          isOpen={true}
          onClose={() => setFileToDelete(null)}
          title={deleteEvidenceWarning ? 'Archive File (Evidence Protected)' : 'Confirm File Deletion'}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {deleteEvidenceWarning ? (
              <div className="p-3.5 rounded-lg dark:bg-amber-500/10 bg-amber-50 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">Forensic Evidence Protection Active</p>
                  <p className="text-[11px] leading-relaxed dark:text-amber-300 text-amber-800">
                    {deleteEvidenceWarning}
                  </p>
                </div>
              </div>
            ) : (
              <p className="dark:text-slate-300 text-slate-700 leading-relaxed">
                Are you sure you want to remove{' '}
                <strong className="text-sky-400 font-mono">{fileToDelete.fileName}</strong>?
                This will delete unreferenced log records imported from this file.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFileToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant={deleteEvidenceWarning ? 'primary' : 'danger'}
                size="sm"
                onClick={executeDelete}
              >
                {deleteEvidenceWarning ? 'Safe Archive' : 'Delete File'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
