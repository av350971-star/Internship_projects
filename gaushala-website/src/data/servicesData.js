import {
  Heart,
  Wheat,
  Stethoscope,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Users,
  HandHeart,
} from "lucide-react";

// Single source of truth for the "Our Services" content — used by both the
// full /services page and the Home page's services preview section, so the
// list only needs to be edited in one place.
export const services = [
  {
    id: "gau-seva",
    icon: Heart,
    title: "गौ सेवा",
    description: "बेसहारा एवं जरूरतमंद गौ माताओं की नियमित देखभाल और सेवा।",
  },
  {
    id: "fodder",
    icon: Wheat,
    title: "चारा एवं भोजन सेवा",
    description: "गौ माताओं के लिए पौष्टिक चारा, हरा घास और स्वच्छ जल की व्यवस्था।",
  },
  {
    id: "medical",
    icon: Stethoscope,
    title: "चिकित्सा एवं देखभाल",
    description: "नियमित स्वास्थ्य जांच और आवश्यक चिकित्सा सहायता।",
  },
  {
    id: "injured-care",
    icon: HeartPulse,
    title: "घायल/बीमार गौ माता की देखभाल",
    description: "घायल एवं बीमार गौ माताओं के उपचार और विशेष देखभाल की व्यवस्था।",
  },
  {
    id: "protection",
    icon: ShieldCheck,
    title: "गौ संरक्षण",
    description: "गौ माताओं की सुरक्षा एवं संरक्षण के लिए निरंतर प्रयास।",
  },
  {
    id: "shelter",
    icon: Sparkles,
    title: "स्वच्छता एवं आश्रय",
    description: "स्वच्छ एवं सुरक्षित आश्रय स्थल का रखरखाव।",
  },
  {
    id: "volunteer",
    icon: Users,
    title: "Volunteer Seva",
    description: "स्वयंसेवकों के सहयोग से गौशाला की सेवाओं को सुचारू रूप से चलाना।",
    to: "/volunteer",
    linkLabel: "Volunteer बनें",
  },
  {
    id: "adoption",
    icon: HandHeart,
    title: "गौ माता Adoption / Sponsorship",
    description: "किसी गौ माता को गोद लेकर या sponsor करके सीधा योगदान दें।",
    to: "/adoption",
    linkLabel: "अभी गोद लें",
  },
];
