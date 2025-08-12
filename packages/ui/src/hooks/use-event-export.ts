import { useCallback } from 'react';
import { TrackingEvent } from '@pixeltracer/shared';

export type ExportFormat = 'json' | 'csv' | 'har';

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  includeParameters?: boolean;
  includeTimestamp?: boolean;
  filename?: string;
  prettyPrint?: boolean;
}

/**
 * Event export functionality hook
 * Supports multiple formats for data analysis and debugging
 */
export function useEventExport() {
  
  const exportToJson = useCallback((events: TrackingEvent[], options: ExportOptions) => {
    const data = options.prettyPrint 
      ? JSON.stringify(events, null, 2)
      : JSON.stringify(events);
    
    return data;
  }, []);

  const exportToCsv = useCallback((events: TrackingEvent[], options: ExportOptions) => {
    if (events.length === 0) return '';

    const headers = [
      'timestamp',
      'provider',
      'providerName',
      'url',
      'method',
      'eventType',
      'confidence',
      'tabId'
    ];

    if (options.includeParameters) {
      headers.push('parameters');
    }

    if (options.includeHeaders) {
      headers.push('requestHeaders', 'responseHeaders');
    }

    const rows: string[] = [];
    
    if (options.includeHeaders !== false) {
      rows.push(headers.join(','));
    }

    for (const event of events) {
      const row = [
        options.includeTimestamp !== false ? new Date(event.timestamp).toISOString() : event.timestamp.toString(),
        `"${event.provider}"`,
        `"${event.providerName}"`,
        `"${event.url}"`,
        `"${event.method}"`,
        `"${event.eventType || ''}"`,
        event.confidence.toString(),
        (event.tabId ?? 0).toString()
      ];

      if (options.includeParameters) {
        row.push(`"${JSON.stringify(event.parameters).replace(/"/g, '""')}"`);
      }

      if (options.includeHeaders) {
        row.push(
          `"${JSON.stringify(event.requestHeaders || {}).replace(/"/g, '""')}"`,
          `"${JSON.stringify(event.responseHeaders || {}).replace(/"/g, '""')}"`
        );
      }

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }, []);

  const exportToHar = useCallback((events: TrackingEvent[], options: ExportOptions) => {
    // Generate HAR format for network analysis tools
    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'PixelTracer',
          version: '3.0.0'
        },
        entries: events.map(event => ({
          startedDateTime: new Date(event.timestamp).toISOString(),
          request: {
            method: event.method,
            url: event.url,
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(event.requestHeaders || {}).map(([name, value]) => ({
              name,
              value
            })),
            queryString: [],
            postData: event.requestBody ? {
              mimeType: 'application/x-www-form-urlencoded',
              text: event.requestBody
            } : undefined,
            headersSize: -1,
            bodySize: event.requestBody?.length || 0
          },
          response: {
            status: event.statusCode || 200,
            statusText: 'OK',
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(event.responseHeaders || {}).map(([name, value]) => ({
              name,
              value
            })),
            content: {
              size: 0,
              mimeType: 'application/json'
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: 0
          },
          cache: {},
          timings: {
            send: 0,
            wait: 0,
            receive: 0
          },
          _pixeltracer: {
            provider: event.provider,
            providerName: event.providerName,
            eventType: event.eventType,
            confidence: event.confidence,
            parameters: event.parameters
          }
        }))
      }
    };

    return options.prettyPrint 
      ? JSON.stringify(har, null, 2)
      : JSON.stringify(har);
  }, []);

  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, []);

  const exportEvents = useCallback((events: TrackingEvent[], options: ExportOptions) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = options.filename || `pixeltracer-events-${timestamp}`;
    
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (options.format) {
      case 'json':
        content = exportToJson(events, options);
        filename = `${baseFilename}.json`;
        mimeType = 'application/json';
        break;
        
      case 'csv':
        content = exportToCsv(events, options);
        filename = `${baseFilename}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'har':
        content = exportToHar(events, options);
        filename = `${baseFilename}.har`;
        mimeType = 'application/json';
        break;
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    downloadFile(content, filename, mimeType);
    return { filename, size: content.length };
  }, [exportToJson, exportToCsv, exportToHar, downloadFile]);

  const copyToClipboard = useCallback(async (events: TrackingEvent[], format: ExportFormat = 'json') => {
    let content: string;

    switch (format) {
      case 'json':
        content = exportToJson(events, { format, prettyPrint: true });
        break;
      case 'csv':
        content = exportToCsv(events, { format, includeHeaders: true });
        break;
      case 'har':
        content = exportToHar(events, { format, prettyPrint: true });
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      return false;
    }
  }, [exportToJson, exportToCsv, exportToHar]);

  const getExportPreview = useCallback((events: TrackingEvent[], format: ExportFormat, limit = 3) => {
    const previewEvents = events.slice(0, limit);
    
    switch (format) {
      case 'json':
        return exportToJson(previewEvents, { format, prettyPrint: true });
      case 'csv':
        return exportToCsv(previewEvents, { format, includeHeaders: true });
      case 'har':
        return exportToHar(previewEvents, { format, prettyPrint: true });
      default:
        return '';
    }
  }, [exportToJson, exportToCsv, exportToHar]);

  return {
    exportEvents,
    copyToClipboard,
    getExportPreview,
    supportedFormats: ['json', 'csv', 'har'] as ExportFormat[]
  };
}