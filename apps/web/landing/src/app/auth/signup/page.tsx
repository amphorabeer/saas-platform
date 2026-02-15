import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const SignupContent = dynamic(() => import('./SignupContent'), {
  loading: () => <div className="min-h-screen flex items-center justify-center">იტვირთება...</div>,
  ssr: false,
})

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">იტვირთება...</div>}>
      <SignupContent />
    </Suspense>
  )
}
