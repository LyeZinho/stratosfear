import React from 'react';
import { NewsArticle } from '../../types/geopolitics';
import { AlertCircle, TrendingUp, TrendingDown, Radio } from 'lucide-react';

interface GlobalMonitorProps {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
}

export const GlobalMonitor: React.FC<GlobalMonitorProps> = ({ articles, onArticleClick }) => {
  const getBiasColor = (bias: NewsArticle['bias']): string => {
    switch (bias) {
      case 'PATRIOTIC':
        return 'text-green-400';
      case 'HOSTILE':
        return 'text-red-400';
      case 'NEUTRAL':
        return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: NewsArticle['category']) => {
    switch (category) {
      case 'MILITARY':
        return <AlertCircle className="w-4 h-4" />;
      case 'VICTORY':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'SETBACK':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gray-900 border border-cyan-700 rounded p-4">
      <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
        <Radio className="w-5 h-5" />
        GLOBAL NEWS MONITOR
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {articles.slice(0, 10).map((article) => (
          <div
            key={article.id}
            className="border border-gray-700 rounded p-3 hover:border-cyan-600 cursor-pointer transition"
            onClick={() => onArticleClick?.(article)}
          >
            <div className="flex items-start gap-2 mb-1">
              {getCategoryIcon(article.category)}
              <span className="text-xs text-gray-500">
                {new Date(article.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className={`text-sm font-semibold ${getBiasColor(article.bias)}`}>
              {article.headline}
            </p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-600">{article.category}</span>
              <span className="text-xs px-2 py-1 bg-gray-800 rounded">
                Importance: {article.importance}/10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
