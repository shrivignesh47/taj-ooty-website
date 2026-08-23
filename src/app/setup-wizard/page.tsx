import { Metadata } from 'next'
import SetupWizard from './SetupWizard'

export const metadata: Metadata = { title: 'Taj POS — Setup' }
export const dynamic = 'force-dynamic'

export default function SetupWizardPage() {
  return <SetupWizard />
}