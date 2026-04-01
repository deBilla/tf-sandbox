import type { TFGraph } from '../../parser/types';
import type { CostAnnotations, CostEstimate } from '../types';
import { lookupCost } from './pricing';

export function annotateCosts(graph: TFGraph): CostAnnotations {
  const perResource: CostEstimate[] = [];
  let totalMonthlyCost = 0;
  let coveredCount = 0;
  let uncoveredCount = 0;

  for (const block of graph.blocks) {
    if (block.kind !== 'resource' || !block.type) continue;

    const price = lookupCost(block.type, block.attributes);
    if (price && price.monthlyCost > 0) {
      perResource.push({
        resourceId: block.id,
        resourceType: block.type,
        monthlyCost: price.monthlyCost,
        unit: price.unit,
        note: price.note,
      });
      totalMonthlyCost += price.monthlyCost;
      coveredCount++;
    } else if (price && price.monthlyCost === 0) {
      perResource.push({
        resourceId: block.id,
        resourceType: block.type,
        monthlyCost: 0,
        unit: '',
        note: price.note || 'No cost',
      });
      coveredCount++;
    } else {
      perResource.push({
        resourceId: block.id,
        resourceType: block.type,
        monthlyCost: null,
        unit: '',
        note: 'No pricing data',
      });
      uncoveredCount++;
    }
  }

  // Sort by cost descending
  perResource.sort((a, b) => (b.monthlyCost ?? 0) - (a.monthlyCost ?? 0));

  return { perResource, totalMonthlyCost, coveredCount, uncoveredCount };
}
