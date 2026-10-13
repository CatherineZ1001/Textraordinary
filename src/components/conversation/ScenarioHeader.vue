<script setup lang="ts">
// The scenario brief: what's going on and what tone to aim for.
// Styled like a note sitting beside the phone.
withDefaults(
  defineProps<{
    title: string
    category: string
    tone: string
    context?: string
  }>(),
  { context: '' },
)
</script>

<template>
  <aside class="brief">
    <h1>{{ title }}</h1>
    <p v-if="context" class="context">{{ context }}</p>
    <dl>
      <div>
        <dt>Aim for</dt>
        <dd class="tone">{{ tone }}</dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd class="category">{{ category }}</dd>
      </div>
    </dl>
  </aside>
</template>

<style scoped>
.brief {
  background: var(--note);
  padding: 28px 28px 24px;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(23, 32, 42, 0.08), 0 14px 30px -18px rgba(23, 32, 42, 0.45);
  transform: rotate(-1.2deg);
}
h1 {
  font-size: 30px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
  max-width: 18ch;
}
.context {
  font-size: 17px;
  margin: 0 0 22px;
  max-width: 38ch;
}
dl {
  margin: 0;
  display: grid;
  gap: 10px;
  border-top: 1.5px dashed rgba(23, 32, 42, 0.25);
  padding-top: 16px;
}
dl div { display: flex; gap: 12px; align-items: baseline; }
dt { font-size: 14px; color: rgba(23, 32, 42, 0.6); min-width: 70px; }
dd { margin: 0; font-weight: 600; }
.tone {
  /* a highlighter swipe: the one thing to remember */
  background: linear-gradient(transparent 55%, rgba(0, 122, 255, 0.24) 55%);
  padding: 0 2px;
}
.category { text-transform: capitalize; font-weight: 500; }

@media (max-width: 860px) {
  .brief { transform: none; padding: 22px 20px 18px; }
  h1 { font-size: 24px; }
  .context { font-size: 16px; }
}
</style>
