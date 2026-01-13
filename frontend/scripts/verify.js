import Web3 from 'web3';

// Initialize Web3
const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
const web3 = new Web3(provider);

// Function to fetch transaction details
async function fetchTransactionDetails(txHash) {
  try {
    const transaction = await web3.eth.getTransaction(txHash);

    if (transaction) {
      console.log('Transaction Details:', transaction);
      return transaction;
    } else {
      console.log('Transaction not found. It may still be pending.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw error;
  }
}

// Add event listener to the verify button
// document.getElementById('verifyBtn').addEventListener('click', async () => {
//   const txHash = document.getElementById('txHashInput').value;
//   const transactionDetailsDiv = document.getElementById('transactionDetails');

//   transactionDetailsDiv.innerHTML = 'Verifying...';

//   try {
//     const transaction = await fetchTransactionDetails(txHash);

//     if (transaction) {
//       transactionDetailsDiv.innerHTML = `
//         <p><strong>From:</strong> ${transaction.from}</p>
//         <p><strong>To:</strong> ${transaction.to}</p>
//         <p><strong>Value:</strong> ${web3.utils.fromWei(transaction.value, 'ether')} ETH</p>
//         <p><strong>Gas Used:</strong> ${transaction.gas}</p>
//       `;
//     } else {
//       transactionDetailsDiv.innerHTML = '<p>Transaction not found. It may still be pending.</p>';
//     }
//   } catch (error) {
//     transactionDetailsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
//   }
// });

// Example usage
const txHash = '0x4bc5d3e2c727f09786997c3b710977feb8083bdbabf421c82f12e30173e20d45'; // Replace with your transaction hash
fetchTransactionDetails(txHash).then((transaction) => {
  if (transaction) {
    // Display transaction details in the console or on the frontend
    console.log(`From: ${transaction.from}`);
    console.log(`To: ${transaction.to}`);
    console.log(`Value: ${web3.utils.fromWei(transaction.value, 'ether')} ETH`);
    console.log(`Gas Used: ${transaction.gas}`);
  }
});