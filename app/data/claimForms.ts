export type TrainingClaimForm = {
  scenarioId: string;
  form: "CMS-1500" | "UB-04";
  path: string;
  label: string;
};

const claimForms: TrainingClaimForm[] = [
  ["AR-3106", "UB-04"],
  ["AR-3119", "UB-04"],
  ["AR-3142", "CMS-1500"],
  ["AR-3160", "UB-04"],
  ["AR-3174", "UB-04"],
  ["DM-5101", "CMS-1500"],
  ["DM-5102", "UB-04"],
  ["DM-5103", "CMS-1500"],
  ["DM-5104", "CMS-1500"],
  ["DM-5105", "UB-04"],
].map(([scenarioId, form]) => ({
  scenarioId,
  form: form as TrainingClaimForm["form"],
  path: `/training-claims/${scenarioId.toLowerCase()}-${form
    .toLowerCase()
    .replace("-", "")}.pdf`,
  label: `Submitted ${form} claim form`,
}));

export function getTrainingClaimForm(scenarioId: string) {
  return claimForms.find((item) => item.scenarioId === scenarioId)!;
}

export { claimForms };
