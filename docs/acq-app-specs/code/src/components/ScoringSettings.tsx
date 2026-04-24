import { useState } from 'react'

export interface ScoringWeights {
  interest: number
  recency: number
  segment: number
  change: number
}

interface ScoringSettingsProps {
  /** Default values for the weight sliders.  Must sum to 1.0. */
  defaults?: ScoringWeights
  /** Callback invoked whenever the weights change after rebalancing */
  onChange?: (weights: ScoringWeights) => void
}

/**
 * A settings panel that allows the user to modify the weights used to compute
 * the priority score for campaign candidates.  Each weight can be locked
 * so it remains unchanged while adjusting the others.  Adjusting one slider
 * redistributes the remaining weight evenly across unlocked sliders.  The sum
 * always remains 1.0.  See UX advice on weighted scoring models for rationale【574565776970297†L202-L214】【574565776970297†L274-L280】.
 */
export function ScoringSettings({ defaults = { interest: 0.45, recency: 0.2, segment: 0.25, change: 0.1 }, onChange }: ScoringSettingsProps) {
  const [weights, setWeights] = useState<ScoringWeights>(defaults)
  const [locked, setLocked] = useState<Record<keyof ScoringWeights, boolean>>({
    interest: false,
    recency: false,
    segment: false,
    change: false,
  })

  const rebalanceWeights = (updated: ScoringWeights, changedKey: keyof ScoringWeights) => {
    const lockedKeys = (Object.keys(locked) as Array<keyof ScoringWeights>).filter(k => locked[k])
    const freeKeys = (Object.keys(updated) as Array<keyof ScoringWeights>).filter(
      k => !locked[k] && k !== changedKey,
    )

    const fixedSum = lockedKeys.reduce((sum, k) => sum + updated[k], 0)
    const targetTotal = 1 - updated[changedKey] - fixedSum
    const currentFreeSum = freeKeys.reduce((sum, k) => sum + updated[k], 0)

    if (freeKeys.length === 0) return updated

    const newWeights = { ...updated }
    freeKeys.forEach(k => {
      newWeights[k] = (newWeights[k] / currentFreeSum) * targetTotal
    })
    return newWeights
  }

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    let newWeights: ScoringWeights = { ...weights, [key]: value }
    newWeights = rebalanceWeights(newWeights, key)
    setWeights(newWeights)
    onChange?.(newWeights)
  }

  return (
    <div className="space-y-4 p-4 border rounded-md bg-gray-50">
      {(Object.keys(weights) as Array<keyof ScoringWeights>).map(key => (
        <div key={key} className="flex items-center space-x-3">
          <label className="w-24 capitalize text-sm font-medium">{key}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={Number(weights[key].toFixed(2))}
            onChange={e => handleWeightChange(key, parseFloat(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={Number(weights[key].toFixed(2))}
            onChange={e => handleWeightChange(key, parseFloat(e.target.value))}
            className="w-16 border px-1 py-0.5"
          />
          <label className="flex items-center space-x-1 text-xs">
            <input
              type="checkbox"
              checked={locked[key]}
              onChange={e => setLocked({ ...locked, [key]: e.target.checked })}
            />
            <span>Lock</span>
          </label>
        </div>
      ))}
    </div>
  )
}
