import React from "react";
import { Check } from "lucide-react";

const PermissionCard = ({
  icon: Icon,
  title,
  description,
  granted,
  onRequest,
  buttonText = "授予权限",
}) => {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 chinese-title truncate">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{description}</p>
          </div>
        </div>
        {granted ? (
          <div className="text-green-600 dark:text-green-400 flex items-center gap-1 flex-shrink-0">
            <Check className="w-3 h-3" />
            <span className="text-xs font-medium">已授予</span>
          </div>
        ) : (
          <button
            onClick={onRequest}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default PermissionCard;