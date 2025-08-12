import * as React from "react"
import { TrackingEvent } from "@pixeltracer/shared"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { 
  ExportFormat, 
  ExportOptions, 
  useEventExport 
} from "../hooks/use-event-export"
import { cn } from "../utils"
import { 
  Download, 
  Copy, 
  FileText, 
  Database, 
  Activity, 
  Eye, 
  Check,
  X
} from "lucide-react"

export interface ExportDialogProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TrackingEvent[]
  onClose?: () => void
  title?: string
}

const ExportDialog = React.forwardRef<HTMLDivElement, ExportDialogProps>(
  ({ className, events, onClose, title = "Export Events", ...props }, ref) => {
    const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('json');
    const [options, setOptions] = React.useState<ExportOptions>({
      format: 'json',
      includeHeaders: true,
      includeParameters: true,
      includeTimestamp: true,
      prettyPrint: true
    });
    const [showPreview, setShowPreview] = React.useState(false);
    const [copying, setCopying] = React.useState(false);
    const [exported, setExported] = React.useState(false);

    const { exportEvents, copyToClipboard, getExportPreview } = useEventExport();

    const formatOptions = React.useMemo(() => [
      {
        format: 'json' as ExportFormat,
        name: 'JSON',
        description: 'JavaScript Object Notation - Best for programmatic use',
        icon: Database,
        size: 'Large',
        compatibility: 'High'
      },
      {
        format: 'csv' as ExportFormat,
        name: 'CSV',
        description: 'Comma Separated Values - Best for spreadsheet analysis',
        icon: FileText,
        size: 'Medium',
        compatibility: 'Universal'
      },
      {
        format: 'har' as ExportFormat,
        name: 'HAR',
        description: 'HTTP Archive - Best for network analysis tools',
        icon: Activity,
        size: 'Large',
        compatibility: 'Tools'
      }
    ], []);

    const handleFormatChange = React.useCallback((format: ExportFormat) => {
      setSelectedFormat(format);
      setOptions(prev => ({ ...prev, format }));
    }, []);

    const handleExport = React.useCallback(async () => {
      try {
        exportEvents(events, options);
        setExported(true);
        setTimeout(() => setExported(false), 2000);
      } catch (error) {
        // Export failed
      }
    }, [events, options, exportEvents]);

    const handleCopy = React.useCallback(async () => {
      setCopying(true);
      try {
        await copyToClipboard(events, selectedFormat);
        setTimeout(() => setCopying(false), 2000);
      } catch (error) {
        setCopying(false);
      }
    }, [events, selectedFormat, copyToClipboard]);

    const preview = React.useMemo(() => {
      if (!showPreview) return '';
      return getExportPreview(events, selectedFormat, 2);
    }, [showPreview, events, selectedFormat, getExportPreview]);

    const estimatedSize = React.useMemo(() => {
      if (events.length === 0) return '0 KB';
      
      // Rough size estimation
      const sampleSize = JSON.stringify(events.slice(0, Math.min(10, events.length))).length;
      const avgEventSize = sampleSize / Math.min(10, events.length);
      const totalSize = avgEventSize * events.length;
      
      const sizeMultiplier = selectedFormat === 'csv' ? 0.6 : selectedFormat === 'har' ? 1.5 : 1;
      const estimatedBytes = totalSize * sizeMultiplier;
      
      if (estimatedBytes < 1024) return `${Math.round(estimatedBytes)} B`;
      if (estimatedBytes < 1024 * 1024) return `${Math.round(estimatedBytes / 1024)} KB`;
      return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    }, [events, selectedFormat]);

    return (
      <Card ref={ref} className={cn("w-full max-w-2xl", className)} {...props}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Export {events.length} event{events.length !== 1 ? 's' : ''} for analysis or backup
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Export Format</div>
            <div className="grid gap-3">
              {formatOptions.map(({ format, name, description, icon: Icon, size, compatibility }) => (
                <div
                  key={format}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent",
                    selectedFormat === format && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleFormatChange(format)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {size}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {compatibility}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Options</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.includeHeaders || false}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include Headers</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.includeParameters || false}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeParameters: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include Parameters</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.includeTimestamp || false}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeTimestamp: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include Timestamps</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.prettyPrint || false}
                  onChange={(e) => setOptions(prev => ({ ...prev, prettyPrint: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Pretty Print</span>
              </label>
            </div>
          </div>

          {/* Size Estimate */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated size:</span>
            <Badge variant="outline">{estimatedSize}</Badge>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Preview</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1"
              >
                <Eye className="w-3 h-3" />
                {showPreview ? 'Hide' : 'Show'}
              </Button>
            </div>
            
            {showPreview && (
              <ScrollArea className="h-40">
                <pre className="text-xs bg-muted p-3 rounded font-mono overflow-x-auto">
                  {preview}
                </pre>
              </ScrollArea>
            )}
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleExport}
              className="flex-1 gap-2"
              disabled={events.length === 0}
            >
              {exported ? (
                <>
                  <Check className="w-4 h-4" />
                  Exported
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export File
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={events.length === 0 || copying}
              className="gap-2"
            >
              {copying ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ExportDialog.displayName = "ExportDialog";

export { ExportDialog }