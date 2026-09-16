import { ScenarioExperience } from '@/components/scenario-experience';

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScenarioExperience scenarioId={id} />;
}
