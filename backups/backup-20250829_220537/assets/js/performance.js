(function() {
  // Performance check for low-power devices
  function isLowPowerDevice() {
    const cpuCores = navigator.hardwareConcurrency;
    const memory = navigator.deviceMemory;

    // Thresholds can be adjusted.
    // Low-power if CPU cores are 4 or less, OR memory is 4GB or less.
    const lowCpu = cpuCores && cpuCores <= 4;
    const lowMemory = memory && memory <= 4;

    return lowCpu || lowMemory;
  }

  if (isLowPowerDevice()) {
    document.body.classList.add('is-low-power');
    console.log('Low-power device detected. Applying simplified experience.');
  }
})();
