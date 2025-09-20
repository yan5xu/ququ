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
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900 chinese-title">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        {granted ? (
          <div className="text-green-600 flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">已授予</span>
          </div>
        ) : (
          <button
            onClick={onRequest}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default PermissionCard;