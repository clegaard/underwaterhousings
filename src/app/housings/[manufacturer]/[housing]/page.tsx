import { redirect } from 'next/navigation'

interface HousingDetailPageProps {
    params: Promise<{ manufacturer: string; housing: string }>
}

export default async function HousingDetailPage({ params }: HousingDetailPageProps) {
    const { manufacturer: manufacturerSlug, housing: housingSlug } = await params
    redirect(`/gear/${manufacturerSlug}/housings/${housingSlug}`)
}
