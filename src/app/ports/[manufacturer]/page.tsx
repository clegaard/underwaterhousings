import { redirect } from 'next/navigation'
interface Props { params: { manufacturer: string } }
export default function PortManufacturerPage({ params }: Props) {
    redirect(`/gear/${params.manufacturer}`)
}
