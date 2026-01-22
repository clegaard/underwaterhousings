'use client'

import { useState } from 'react'
import Image from 'next/image'
import { HousingImage } from '@/components/HousingImage'

interface ImageGalleryProps {
    images: Array<{
        src: string
        fallback: string
        type: string
        alt: string
    }>
}

export default function ImageGallery({ images }: ImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<number | null>(null)

    const openModal = (index: number) => {
        setSelectedImage(index)
    }

    const closeModal = () => {
        setSelectedImage(null)
    }

    const nextImage = () => {
        if (selectedImage !== null) {
            setSelectedImage((selectedImage + 1) % images.length)
        }
    }

    const prevImage = () => {
        if (selectedImage !== null) {
            setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1)
        }
    }

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            closeModal()
        } else if (event.key === 'ArrowLeft') {
            prevImage()
        } else if (event.key === 'ArrowRight') {
            nextImage()
        }
    }

    if (images.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Images</h3>
                <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="text-4xl mb-2">📷</div>
                        <p>No images available</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Images</h3>
                <div className="space-y-4">
                    {/* Main/Featured Image */}
                    <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden cursor-pointer group">
                        <div onClick={() => openModal(0)}>
                            <HousingImage
                                src={images[0].src}
                                fallback={images[0].fallback}
                                alt={images[0].alt}
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium capitalize">
                                {images[0].type} view
                            </div>
                            {/* Click indicator */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-3">
                                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Images */}
                    {images.length > 1 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {images.slice(1).map((image, index) => (
                                <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
                                    <div onClick={() => openModal(index + 1)}>
                                        <HousingImage
                                            src={image.src}
                                            fallback={image.fallback}
                                            alt={image.alt}
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium capitalize">
                                            {image.type}
                                        </div>
                                        {/* Click indicator */}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-2">
                                                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedImage !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
                    onClick={closeModal}
                    onKeyDown={handleKeyPress}
                    tabIndex={0}
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Close button */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200"
                        >
                            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Navigation buttons */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                    className="absolute left-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 transition-all duration-200"
                                >
                                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                    className="absolute right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 transition-all duration-200"
                                >
                                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Image */}
                        <div className="relative bg-white rounded-lg p-4 max-w-[90vw] max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <div className="relative max-w-full max-h-full flex items-center justify-center">
                                <Image
                                    src={images[selectedImage].src}
                                    alt={images[selectedImage].alt}
                                    width={800}
                                    height={600}
                                    className="max-w-full max-h-[80vh] object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = images[selectedImage].fallback
                                    }}
                                />
                                {/* Image info */}
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm font-medium capitalize">
                                    {images[selectedImage].type} view
                                </div>
                                {images.length > 1 && (
                                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm font-medium">
                                        {selectedImage + 1} of {images.length}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}