import { AgentFailureInbox } from "@/components/marketing/agent-failure-inbox";
import { ControlLayerDiagram } from "@/components/marketing/control-layer-diagram";
import { DesignPartnerCTA, FinalProductCTA } from "@/components/marketing/conversion-sections";
import { DifferentiationSystem } from "@/components/marketing/differentiation-system";
import { GovernedExportMachine } from "@/components/marketing/governed-export-machine";
import { GovernanceArchitecture } from "@/components/marketing/governance-architecture";
import { HeroProductTheatre } from "@/components/marketing/hero-product-theatre";
import { IntegrationLogoMarquee } from "@/components/marketing/integration-logo-marquee";
import { AdoptionStageSelector, HumanProofReadySection, OldWayNewWayContrast, ProductFilmSection, WorkflowAssessmentCTA } from "@/components/marketing/product-conversion-sections";
import { ProductJourneyShowcase } from "@/components/marketing/product-journey-showcase";
import { ScenarioWorkflowDemos } from "@/components/marketing/scenario-workflow-demos";

export default function HomePage() {
  return (
    <main>
      <HeroProductTheatre />
      <IntegrationLogoMarquee />
      <ControlLayerDiagram />
      <AgentFailureInbox />
      <ProductFilmSection />
      <ProductJourneyShowcase />
      <GovernedExportMachine />
      <ScenarioWorkflowDemos />
      <DifferentiationSystem />
      <OldWayNewWayContrast />
      <AdoptionStageSelector />
      <GovernanceArchitecture />
      <WorkflowAssessmentCTA />
      <DesignPartnerCTA />
      <HumanProofReadySection />
      <FinalProductCTA />
    </main>
  );
}
