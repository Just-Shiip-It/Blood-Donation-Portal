import { Suspense } from 'react'
import { SearchPage } from '@/components/search/search-page'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function Search() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<LoadingSpinner />}>
                <SearchPage />
            </Suspense>
        </div>
    )
}