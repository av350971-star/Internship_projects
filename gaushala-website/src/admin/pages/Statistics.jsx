import { useState } from "react";
import { Plus, Trash2, BarChart3 } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import { inputClass, labelClass } from "../../components/ui/formStyles.js";

// Every field change here saves immediately (context state → localStorage),
// so the Home page's Stats section always reflects the latest values.
export default function Statistics() {
  const { statistics, addStatistic, updateStatistic, deleteStatistic } =
    useGaushalaData();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  return (
    <div>
      <AdminPageHeader
        title="Statistics"
        subtitle="ये आंकड़े Home page के Stats सेक्शन में दिखते हैं।"
        action={
          <button
            type="button"
            onClick={() => addStatistic({ label: "नया आंकड़ा", value: null })}
            className="flex items-center gap-2 rounded-full bg-pasture-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pasture-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Statistic
          </button>
        }
      />

      {statistics.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="अभी कोई सांख्यिकी उपलब्ध नहीं है।"
          subtitle="'Add Statistic' पर क्लिक करके शुरू करें।"
        />
      ) : (
        <div className="space-y-4">
          {statistics.map((stat) => (
            <AdminCard key={stat.id}>
              <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto_auto]">
                <div>
                  <label className={labelClass}>Label</label>
                  <input
                    value={stat.label}
                    onChange={(e) => updateStatistic(stat.id, { label: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Value</label>
                  <input
                    value={stat.value ?? ""}
                    onChange={(e) =>
                      updateStatistic(stat.id, {
                        value: e.target.value === "" ? null : e.target.value,
                      })
                    }
                    placeholder="—"
                    className={inputClass}
                  />
                </div>
                <label className="flex items-center gap-2 pb-2.5 text-sm text-brown-600">
                  <input
                    type="checkbox"
                    checked={stat.enabled}
                    onChange={(e) =>
                      updateStatistic(stat.id, { enabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-pasture-500"
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(stat.id)}
                  aria-label="हटाएं"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        message="यह आंकड़ा हमेशा के लिए हट जाएगा।"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          deleteStatistic(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
