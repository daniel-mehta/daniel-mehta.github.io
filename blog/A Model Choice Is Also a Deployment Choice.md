# A Model Choice Is Also a Deployment Choice
> 2026-09-17

I recently looked at some of Cohere’s models as part of my MSc, and one thing stood out to me: model selection and deployment selection are not independent decisions.

Rerank provides a good example. A cross-encoder can make much more detailed comparisons of relevance between a query and a document, but it can be expensive to apply that comparison across an entire document collection. That is why it follows an initial retrieval stage and reranks only a smaller set of candidates.

The model’s design already accounts for accuracy, latency, and compute requirements.

However, the trade-offs remain even after deciding how to deploy it.

Cohere makes its models available through its API, Model Vault, which provides managed dedicated infrastructure, and private deployment, where organisations have more control over the underlying environment.

The impact on cost, latency, privacy, infrastructure overhead, and control can vary even when the underlying ML task remains unchanged.

The same is true of completely different systems. A reranking system can be assessed with metrics such as nDCG or mean reciprocal rank, while a speech-recognition model such as Transcribe should be evaluated using measures such as word error rate. Yet both still need to satisfy the operational requirements of the organisation using them.

What I concluded, primarily, was that it is incomplete to assess an ML system only at the model level.

There are trade-offs within the model, and there are also trade-offs in how that model reaches production.
