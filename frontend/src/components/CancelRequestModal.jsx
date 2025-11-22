import React, { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { requestsAPI } from '../services/api'

const CancelRequestModal = ({ isOpen, onClose, request }) => {
  const [comment, setComment] = useState('')
  const queryClient = useQueryClient()

  const cancelMutation = useMutation(
    (data) => requestsAPI.cancel(request.id, data),
    {
      onSuccess: (response) => {
        toast.success('Request cancelled successfully')
        // Invalidate and refetch queries
        queryClient.invalidateQueries(['requests'])
        queryClient.invalidateQueries(['request', request.id])
        onClose()
        setComment('')
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to cancel request'
        toast.error(message)
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    cancelMutation.mutate({ comment: comment.trim() || 'Cancelled by requestor' })
  }

  const handleClose = () => {
    if (!cancelMutation.isLoading) {
      setComment('')
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-6 h-6 text-error-500" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-secondary-900"
                    >
                      Cancel Request
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    onClick={handleClose}
                    disabled={cancelMutation.isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <p className="text-sm text-secondary-600 mb-4">
                      Are you sure you want to cancel this request? This action cannot be undone.
                    </p>

                    <div className="p-3 bg-secondary-50 rounded-lg mb-4">
                      <p className="text-sm font-medium text-secondary-900">
                        Request: {request?.type?.split('-').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </p>
                      <p className="text-xs text-secondary-600 mt-1">
                        Status: {request?.status}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="cancel-comment"
                        className="block text-sm font-medium text-secondary-700 mb-2"
                      >
                        Reason for cancellation (optional)
                      </label>
                      <textarea
                        id="cancel-comment"
                        rows={3}
                        className="input"
                        placeholder="Please provide a reason for cancelling this request..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={cancelMutation.isLoading}
                        maxLength={500}
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        {comment.length}/500 characters
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleClose}
                      disabled={cancelMutation.isLoading}
                    >
                      Keep Request
                    </button>
                    <button
                      type="submit"
                      className="btn-error"
                      disabled={cancelMutation.isLoading}
                    >
                      {cancelMutation.isLoading ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⏳</span>
                          Cancelling...
                        </>
                      ) : (
                        'Cancel Request'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default CancelRequestModal
