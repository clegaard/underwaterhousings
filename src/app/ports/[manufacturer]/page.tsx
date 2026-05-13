import { redirect } from 'next/navigation'
interface Props { params: Promise<{ manufacturer: string }> }
export default async function PortManufacturerPage({ params }: Props) {
    const { manufacturer } = await params
    redirect(`/gear/${manufacturer}`)
}
