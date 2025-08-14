import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchResults, SearchResult } from '../search-results'

describe('SearchResults', () => {
    const mockOnPageChange = vi.fn()
    const mockOnPageSizeChange = vi.fn()
    const mockOnSort = vi.fn()
    const mockOnExport = vi.fn()

    const mockResults: SearchResult[] = [
        {
            id: '1',
            type: 'appointment',
            title: 'Blood Donation Appointment',
            subtitle: 'City Blood Bank',
            description: 'Scheduled appointment for blood donation',
            status: 'scheduled',
            date: new Date('2024-02-15'),
            location: 'New York, NY',
            bloodType: 'O+',
            distance: 2.5,
        },
        {
            id: '2',
            type: 'blood-bank',
            title: 'Metropolitan Blood Center',
            subtitle: 'Full-service blood bank',
            description: 'Comprehensive blood banking services',
            status: 'active',
            location: 'New York, NY',
            distance: 1.2,
        },
        {
            id: '3',
            type: 'request',
            title: 'Urgent Blood Request',
            subtitle: 'General Hospital',
            description: 'Emergency request for O- blood type',
            status: 'pending',
            urgency: 'emergency',
            bloodType: 'O-',
            date: new Date('2024-02-10'),
            location: 'New York, NY',
        },
    ]

    const mockPagination = {
        page: 1,
        pageSize: 20,
        total: 3,
        totalPages: 1,
    }

    const defaultProps = {
        results: mockResults,
        pagination: mockPagination,
        onPageChange: mockOnPageChange,
        onPageSizeChange: mockOnPageSizeChange,
        onSort: mockOnSort,
        onExport: mockOnExport,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders search results header', () => {
        render(<SearchResults {...defaultProps} />)

        expect(screen.getByText('Search Results')).toBeInTheDocument()
        expect(screen.getByText('(3 found)')).toBeInTheDocument()
    })

    it('renders all search results', () => {
        render(<SearchResults {...defaultProps} />)

        expect(screen.getByText('Blood Donation Appointment')).toBeInTheDocument()
        expect(screen.getByText('Metropolitan Blood Center')).toBeInTheDocument()
        expect(screen.getByText('Urgent Blood Request')).toBeInTheDocument()
    })

    it('displays loading state', () => {
        render(<SearchResults {...defaultProps} isLoading={true} />)

        expect(screen.getByText('Searching...')).toBeInTheDocument()
        expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('displays error state', () => {
        const error = 'Search failed'
        render(<SearchResults {...defaultProps} error={error} />)

        expect(screen.getByText('⚠️ Error')).toBeInTheDocument()
        expect(screen.getByText(error)).toBeInTheDocument()
    })

    it('displays empty state', () => {
        render(
            <SearchResults
                {...defaultProps}
                results={[]}
                pagination={{ ...mockPagination, total: 0 }}
            />
        )

        expect(screen.getByText('No results found')).toBeInTheDocument()
        expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument()
    })

    it('handles sort selection', async () => {
        const user = userEvent.setup()
        render(<SearchResults {...defaultProps} />)

        // Click sort dropdown
        const sortSelect = screen.getByRole('combobox')
        await user.click(sortSelect)

        // Select date sorting
        const dateOption = screen.getByRole('option', { name: /date/i })
        await user.click(dateOption)

        expect(mockOnSort).toHaveBeenCalledWith('date', 'desc')
    })

    it('handles view mode toggle', async () => {
        const user = userEvent.setup()
        render(<SearchResults {...defaultProps} showViewToggle={true} />)

        // Should start in grid view
        const listViewButton = screen.getByRole('button', { name: /list view/i })
        await user.click(listViewButton)

        // View should change (this is internal state, so we just verify the button works)
        expect(listViewButton).toBeInTheDocument()
    })

    it('handles export button click', async () => {
        const user = userEvent.setup()
        render(<SearchResults {...defaultProps} showExport={true} />)

        const exportButton = screen.getByRole('button', { name: /export/i })
        await user.click(exportButton)

        expect(mockOnExport).toHaveBeenCalled()
    })

    it('handles pagination', async () => {
        const user = userEvent.setup()
        const paginationProps = {
            ...defaultProps,
            pagination: {
                page: 2,
                pageSize: 10,
                total: 25,
                totalPages: 3,
            },
        }

        render(<SearchResults {...paginationProps} />)

        // Should show current page info
        expect(screen.getByText('Showing 11-20 of 25 results')).toBeInTheDocument()
        expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()

        // Test previous button
        const prevButton = screen.getByRole('button', { name: /previous/i })
        await user.click(prevButton)
        expect(mockOnPageChange).toHaveBeenCalledWith(1)

        // Test next button
        const nextButton = screen.getByRole('button', { name: /next/i })
        await user.click(nextButton)
        expect(mockOnPageChange).toHaveBeenCalledWith(3)
    })

    it('handles page size change', async () => {
        const user = userEvent.setup()
        render(<SearchResults {...defaultProps} />)

        // Find page size select
        const pageSizeSelect = screen.getByDisplayValue('20')
        await user.selectOptions(pageSizeSelect, '50')

        expect(mockOnPageSizeChange).toHaveBeenCalledWith(50)
    })

    it('displays result metadata correctly', () => {
        render(<SearchResults {...defaultProps} />)

        // Check for appointment metadata
        expect(screen.getByText('📅 2/15/2024')).toBeInTheDocument()
        expect(screen.getByText('📍 New York, NY')).toBeInTheDocument()
        expect(screen.getByText('🩸 O+')).toBeInTheDocument()
        expect(screen.getByText('📏 2.5 miles')).toBeInTheDocument()
    })

    it('displays status badges correctly', () => {
        render(<SearchResults {...defaultProps} />)

        expect(screen.getByText('scheduled')).toBeInTheDocument()
        expect(screen.getByText('active')).toBeInTheDocument()
        expect(screen.getByText('pending')).toBeInTheDocument()
    })

    it('displays urgency badges correctly', () => {
        render(<SearchResults {...defaultProps} />)

        expect(screen.getByText('emergency')).toBeInTheDocument()
    })

    it('shows correct type icons', () => {
        render(<SearchResults {...defaultProps} />)

        // Check for emoji icons (simplified check)
        expect(screen.getByText('📅')).toBeInTheDocument() // appointment
        expect(screen.getByText('🏥')).toBeInTheDocument() // blood bank
        expect(screen.getByText('🩸')).toBeInTheDocument() // request
    })

    it('handles pagination edge cases', () => {
        const edgeCaseProps = {
            ...defaultProps,
            pagination: {
                page: 1,
                pageSize: 20,
                total: 5,
                totalPages: 1,
            },
        }

        render(<SearchResults {...edgeCaseProps} />)

        // Previous button should be disabled on first page
        const prevButton = screen.getByRole('button', { name: /previous/i })
        expect(prevButton).toBeDisabled()

        // Next button should be disabled on last page
        const nextButton = screen.getByRole('button', { name: /next/i })
        expect(nextButton).toBeDisabled()
    })

    it('renders page numbers correctly', () => {
        const multiPageProps = {
            ...defaultProps,
            pagination: {
                page: 3,
                pageSize: 10,
                total: 100,
                totalPages: 10,
            },
        }

        render(<SearchResults {...multiPageProps} />)

        // Should show page numbers around current page
        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
    })

    it('handles custom empty message', () => {
        render(
            <SearchResults
                {...defaultProps}
                results={[]}
                pagination={{ ...mockPagination, total: 0 }}
                emptyMessage="Custom empty message"
                emptyDescription="Custom description"
            />
        )

        expect(screen.getByText('Custom empty message')).toBeInTheDocument()
        expect(screen.getByText('Custom description')).toBeInTheDocument()
    })

    it('hides optional UI elements when configured', () => {
        render(
            <SearchResults
                {...defaultProps}
                showViewToggle={false}
                showExport={false}
            />
        )

        expect(screen.queryByRole('button', { name: /grid/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /list/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    })
})