# Reliable microphone Start/Stop

The user delegated selection and implementation of one high-value change. The selected change makes microphone cancellation reliable in Fretwise listens. A reproduction on latest main confirmed that Start → Stop → Start lets the first permission result activate listening and causes the second result to be discarded.

## Scope and approach

Each start attempt owns an identity, AudioContext and eventual MediaStream. Only the current attempt may activate listening or update its status. Stop, navigation and page hiding invalidate the attempt immediately, close its context and stop any acquired tracks. Late permission results release their own tracks. Setup errors release resources and allow a new attempt. The pending button explicitly offers cancellation.

An additional boolean would still confuse overlapping requests. Disabling Start until the old request settles would prevent retry when a permission prompt remains unanswered. Per-attempt ownership is the chosen approach, consistent with the app's existing cancellation guards for audio playback.

Keep plain JavaScript and the existing pitch detector, judging rules and practice content. No dependencies, audio asset changes or deployment. Verification covers cancellation in either completion order, stale failures, suspended/resume failures, setup failures, lifecycle events and ordinary successful listening. Real-device microphone accuracy is outside this change.
