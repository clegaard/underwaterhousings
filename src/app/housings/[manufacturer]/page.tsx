import { redirect } from 'next/navigation'
interface Props { params: Promise<{ manufacturer: string }> }
export default async function HousingManufacturerPage({ params }: Props) {
    const { manufacturer } = await params
    redirect(`/gear/${manufacturer}`)
}
