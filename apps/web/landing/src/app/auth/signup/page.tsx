import { Suspense } from 'react'
import SignupContent from './SignupContent'

export default function SignupPage() {
  return (
    <Suspense fallback={<div>იტვირთება...</div>}>
      <SignupContent />
    </Suspense>
  )
}
