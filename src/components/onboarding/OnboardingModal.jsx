import HintGuideModal from '../hints/HintGuideModal';

/** @deprecated Use HintGuideModal directly */
export default function OnboardingModal(props) {
  return <HintGuideModal {...props} hintId="welcome" />;
}
