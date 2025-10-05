export interface Section {
  id: string;
  name: string;
  icon: string;
}

export interface DestinationData {
  name: string;
  description: string;
  region: string;
  country: string;
  quickInfo: string[];
  gradientColors: string;
  sections: Section[];
}