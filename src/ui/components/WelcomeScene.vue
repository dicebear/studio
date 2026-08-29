<template>
  <div class="welcome">
    <svg class="mark" viewBox="0 0 192 192" aria-hidden="true">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M12.0002 0C5.37283 0 0.000244141 5.37258 0.000244141 12V180C0.000244141 186.627 5.37283 192 12.0002 192H114.715C120.765 192 124.623 185.543 121.685 180.254C113.79 166.036 106.248 153.486 101.5 148.06C87.972 132.599 24.4886 147.017 22.4813 96.5767C22.3495 93.2645 24.5769 90.3674 27.7216 89.3191L58.6927 78.9954C60.5044 78.3915 62.0369 77.1606 63.0699 75.5544C65.9953 71.0062 72.5266 61.4132 78.5002 56.5596C84.152 51.9675 93.2974 46.1272 109.992 43.4471C113.331 42.9111 115.982 40.4227 117.609 37.4577C121.514 30.3382 129.259 26.0169 137.42 27.1914C148.08 28.7256 155.414 39.0544 153.801 50.2607C153.682 51.0845 153.956 51.9224 154.576 52.4772C161.683 58.8311 169.196 67.6305 176.632 77.5686C181.401 83.9432 192 80.7164 192 72.7552V12C192 5.37264 186.628 9.89565e-05 180 0H12.0002Z"
        fill="currentColor"
      />
      <circle cx="10" cy="10" r="10" transform="matrix(-1 0 0 1 107 67)" fill="currentColor" />
    </svg>
    <h1 class="title">DiceBear Studio</h1>
    <p class="intro">Turn a Figma frame into a DiceBear avatar style, and back.</p>
    <div class="cards">
      <div class="card">
        <p class="card-title">Import a style</p>
        <p class="card-text">
          Open an empty Figma file and pick a DiceBear definition file with the Import button below.
        </p>
      </div>
      <div class="card">
        <p class="card-title">Export a style</p>
        <p class="card-text">
          Select the square frame that holds your avatar. Its settings and the export appear here right away.
        </p>
      </div>
    </div>
    <p class="guide">
      <a href="https://www.dicebear.com/create-styles/with-figma/" target="_blank" rel="noopener">
        Read the guide
      </a>
    </p>
  </div>
</template>

<style scoped>
.welcome {
  align-self: center;
  margin: 0 auto;
  padding: 24px 40px;
  max-width: 560px;
  text-align: center;
}

.mark {
  width: 40px;
  height: 40px;
  color: var(--figma-color-text);
}

.title {
  margin: 10px 0 4px;
  font-size: 13px;
  font-weight: 600;
}

.intro {
  margin: 0 0 16px;
  font-size: 11px;
  color: var(--figma-color-text-secondary);
}

.cards {
  display: flex;
  gap: 8px;
  text-align: left;
}

.card {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  background-color: var(--figma-color-bg-secondary);
}

.card-title {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
}

.card-text {
  margin: 0;
  font-size: 11px;
  color: var(--figma-color-text-secondary);
}

.guide {
  margin: 16px 0 0;
  font-size: 11px;
}
</style>
