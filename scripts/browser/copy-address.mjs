// Public receiving-address convenience only. No wallet API, network request or clipboard read.
for (const card of document.querySelectorAll('[data-address-copy]')) {
  const addressNode = card.querySelector('[data-receiving-address]');
  const button = card.querySelector('[data-copy-button]');
  const paymentLink = card.querySelector('[data-payment-link]');
  const status = card.querySelector('[data-copy-status]');
  const asset = card.dataset.asset;
  const scheme = { BTC: 'bitcoin', LTC: 'litecoin' }[asset];
  const address = addressNode?.textContent?.trim();
  if (!addressNode || !button || !status || !scheme || !address || paymentLink?.getAttribute('href') !== `${scheme}:${address}`) continue;
  button.hidden = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(address);
      status.textContent = `${asset} address copied. Check the full address and ${card.dataset.network} in your wallet before sending.`;
    } catch {
      let selected = false;
      try {
        addressNode.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(addressNode);
        selection?.removeAllRanges();
        selection?.addRange(range);
        selected = selection?.toString() === address;
      } catch { /* The visible address remains available for manual selection. */ }
      status.textContent = selected
        ? `Automatic copying is unavailable. The full ${asset} address is selected; use your device’s Copy action.`
        : `Automatic copying is unavailable. Select the full ${asset} address above and use your device’s Copy action.`;
    } finally {
      button.disabled = false;
    }
  });
}
