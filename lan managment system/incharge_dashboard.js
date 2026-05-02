// incharge_dashboard.js
import { app } from './firebase-config.js';
import { showMessage } from './utils.js';

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, doc, getDoc, addDoc, 
    updateDoc, query, where, serverTimestamp, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const welcomeMessage = document.getElementById('welcomeMessage');
const logoutButton = document.getElementById('logoutButton');
const messageContainerId = 'message-container';
const modalContainer = document.getElementById('modalContainer');
const labsList = document.getElementById('labsList');
const studentRequestsList = document.getElementById('studentRequestsList');
const historyRequestsList = document.getElementById('historyRequestsList');
const pendingRequestsBtn = document.getElementById('pendingRequestsBtn');
const historyRequestsBtn = document.getElementById('historyRequestsBtn');
const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');
const historyRequestsContainer = document.getElementById('historyRequestsContainer');
const requirementForm = document.getElementById('requirementForm');
const requirementsList = document.getElementById('requirementsList');
const reqLabSelect = document.getElementById('reqLabSelect');
const complaintsList = document.getElementById('complaintsList');

const tabs = {
    labs: document.getElementById('labsTab'),
    requests: document.getElementById('requestsTab'),
    requirements: document.getElementById('requirementsTab'), 
    complaints: document.getElementById('complaintsTab')
};
const sections = {
    labs: document.getElementById('labsSection'),
    requests: document.getElementById('requestsSection'),
    requirements: document.getElementById('requirementsSection'), 
    complaints: document.getElementById('complaintsSection')
};

// --- State ---
let unsubscribers = [];
let currentSelectedLab = null;
let managedLabs = []; 
let managedLabIds = [];
let currentUserData = null;

// --- Authentication & Initialization ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        // Check for 'incharge' role
        if (userDoc.exists() && userDoc.data().role === 'incharge') {
            currentUserData = userDoc.data();
            welcomeMessage.textContent = `Welcome, ${currentUserData.name || user.email}!`;
            await fetchManagedLabs(user.uid);
            showSection('labs');
        } else {
            await signOut(auth);
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

async function fetchManagedLabs(inchargeId) {
    try {
        // Query by 'inchargeId'
        const labsQuery = query(collection(db, 'labs'), where('inchargeId', '==', inchargeId));
        const snapshot = await getDocs(labsQuery);
        managedLabs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        managedLabIds = managedLabs.map(lab => lab.id);
        
        // Populate lab dropdowns once labs are fetched
        reqLabSelect.innerHTML = managedLabs.map(lab => `<option value="${lab.id}|${lab.name}">${lab.name}</option>`).join('');
    } catch (error) {
        console.error("Error fetching managed labs:", error);
        showMessage("Could not load your assigned labs.", 'error', messageContainerId);
    }
}

// --- UI & Section Management ---
function showSection(sectionName) {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    Object.keys(sections).forEach(key => {
        sections[key].classList.toggle('hidden', key !== sectionName);
        tabs[key].classList.toggle('active', key === sectionName);
    });

    switch(sectionName) {
        case 'labs':
            setupLabsListener();
            break;
        case 'requests':
            setupStudentRequestsListener();
            setupHistoryRequestsListener();
            showRequestTab('pending');
            break;
        case 'requirements':
            setupRequirementsListener();
            break;
        case 'complaints':
            setupComplaintsListener();
            break;
    }
}

Object.keys(tabs).forEach(key => {
    tabs[key].addEventListener('click', (e) => { e.preventDefault(); showSection(key); });
});

function showRequestTab(tabName) {
    if (tabName === 'pending') {
        pendingRequestsContainer.classList.remove('hidden');
        historyRequestsContainer.classList.add('hidden');
        pendingRequestsBtn.classList.add('active');
        historyRequestsBtn.classList.remove('active');
    } else {
        pendingRequestsContainer.classList.add('hidden');
        historyRequestsContainer.classList.remove('hidden');
        pendingRequestsBtn.classList.remove('active');
        historyRequestsBtn.classList.add('active');
    }
}
pendingRequestsBtn.addEventListener('click', () => showRequestTab('pending'));
historyRequestsBtn.addEventListener('click', () => showRequestTab('history'));

// --- Lab & Component Management ---
function setupLabsListener() {
    labsList.innerHTML = '';
    if (managedLabs.length === 0) {
        labsList.innerHTML = '<p class="text-gray-500 col-span-full text-center">You are not assigned to any labs yet.</p>';
    }
    managedLabs.forEach(lab => renderLabCard(lab));
}

function renderLabCard(lab) {
    const card = document.createElement('div');
    card.className = 'bg-white p-6 rounded-xl shadow-lg border flex flex-col justify-between hover:shadow-indigo-100 transition-shadow';
    card.innerHTML = `
        <div>
            <h3 class="text-xl font-bold text-gray-800">${lab.name}</h3>
            <p class="text-gray-500 text-sm mb-1">Room: ${lab.roomNo}</p>
            <p class="text-xs text-gray-400">${lab.description || 'No description.'}</p>
        </div>
        <div class="mt-6 flex flex-col sm:flex-row gap-2">
            <button class="components-btn w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-indigo-700 text-sm">Components</button>
            <button class="registers-btn w-full bg-gray-700 text-white py-2 px-4 rounded-md font-semibold hover:bg-gray-800 text-sm">Registers</button>
        </div>
    `;
    card.querySelector('.components-btn').addEventListener('click', () => openComponentManager(lab));
    card.querySelector('.registers-btn').addEventListener('click', () => openAccessKeyPrompt(lab));
    labsList.appendChild(card);
}

// --- Student Request Management ---
async function setupStudentRequestsListener() {
    studentRequestsList.innerHTML = '<p class="text-gray-500 text-center">Loading requests...</p>';
    if (managedLabIds.length === 0) {
        studentRequestsList.innerHTML = '<p class="text-gray-500 text-center">You are not assigned to any labs, so there are no requests to show.</p>';
        return;
    }
    
    let allRequests = [];
    managedLabIds.forEach(labId => {
        // Query requests for labs managed by the Incharge
        const q = query(collection(db, 'requests'), where('labId', '==', labId), where('status', '==', 'pending'));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const request = { id: change.doc.id, ...change.doc.data() };
                if (change.type === "added") {
                    if (!allRequests.find(r => r.id === request.id)) allRequests.push(request);
                }
                if (change.type === "removed") {
                    allRequests = allRequests.filter(r => r.id !== request.id);
                }
            });
            renderAllPendingRequests();
        });
        unsubscribers.push(unsub);
    });
    
    const renderAllPendingRequests = () => {
        studentRequestsList.innerHTML = '';
        if (allRequests.length === 0) {
            studentRequestsList.innerHTML = '<p class="text-gray-500 text-center">No pending component requests for your labs.</p>';
            return;
        }
        allRequests.sort((a, b) => b.requestDate.seconds - a.requestDate.seconds);
        allRequests.forEach(req => renderStudentRequestCard(req));
    };
}

async function setupHistoryRequestsListener() {
    historyRequestsList.innerHTML = '<p class="text-gray-500 text-center">Loading history...</p>';
    if (managedLabIds.length === 0) return;

    let allHistory = [];
    managedLabIds.forEach(labId => {
        ['approved', 'rejected'].forEach(status => {
            const q = query(collection(db, 'requests'), where('labId', '==', labId), where('status', '==', status), orderBy('requestDate', 'desc'));
            const unsub = onSnapshot(q, (snapshot) => {
                 snapshot.docChanges().forEach((change) => {
                    const request = { id: change.doc.id, ...change.doc.data() };
                    if (change.type === "added") {
                        if (!allHistory.find(r => r.id === request.id)) allHistory.push(request);
                    }
                });
                renderAllHistoryRequests();
            });
            unsubscribers.push(unsub);
        });
    });

    const renderAllHistoryRequests = () => {
        historyRequestsList.innerHTML = '';
         if (allHistory.length === 0) {
            historyRequestsList.innerHTML = '<p class="text-gray-500 text-center">No historical requests found.</p>';
            return;
        }
        allHistory.sort((a, b) => b.requestDate.seconds - a.requestDate.seconds);
        allHistory.forEach(req => renderHistoryRequestCard(req));
    };
}

function renderStudentRequestCard(req) {
    const card = document.createElement('div');
    card.className = 'p-4 border rounded-lg bg-yellow-50 flex justify-between items-center';
    card.innerHTML = `
        <div>
            <p class="font-bold text-gray-800">${req.componentName} (Qty: ${req.quantity})</p>
            <p class="text-sm text-gray-600">For Lab: <span class="font-semibold">${req.labName}</span></p>
            <p class="text-sm text-gray-500 mt-1">Requested by: <span class="font-medium text-gray-700">${req.studentName || 'Unknown Student'}</span></p>
        </div>
        <div class="flex space-x-2 flex-shrink-0">
            <button class="approve-btn bg-green-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-green-600">Approve</button>
            <button class="reject-btn bg-red-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-red-600">Reject</button>
        </div>
    `;
    card.querySelector('.approve-btn').addEventListener('click', () => updateRequestStatus(req.id, 'approved'));
    card.querySelector('.reject-btn').addEventListener('click', () => updateRequestStatus(req.id, 'rejected'));
    studentRequestsList.appendChild(card);
}

function renderHistoryRequestCard(req) {
    const card = document.createElement('div');
    const cardColor = req.status === 'approved' ? 'bg-green-50' : 'bg-red-50';
    const statusColor = req.status === 'approved' ? 'text-green-700' : 'text-red-700';
    
    card.className = `p-4 border rounded-lg ${cardColor} flex justify-between items-center`;
    card.innerHTML = `
        <div>
            <p class="font-bold text-gray-800">${req.componentName} (Qty: ${req.quantity})</p>
            <p class="text-sm text-gray-600">For Lab: <span class="font-semibold">${req.labName}</span></p>
            <p class="text-sm text-gray-500 mt-1">Requested by: <span class="font-medium text-gray-700">${req.studentName || 'Unknown Student'}</span></p>
        </div>
        <div class="text-right">
             <p class="font-bold text-sm ${statusColor}">${req.status.toUpperCase()}</p>
             <p class="text-xs text-gray-400 mt-1">${new Date(req.requestDate.seconds * 1000).toLocaleDateString()}</p>
        </div>
    `;
    historyRequestsList.appendChild(card);
}

async function updateRequestStatus(reqId, status) {
    try {
        await updateDoc(doc(db, 'requests', reqId), { status });
        showMessage(`Request marked as ${status}.`, 'success', messageContainerId);
    } catch (error) { showMessage(`Error: ${error.message}`, 'error', messageContainerId); }
}

// --- Lab Requirements ---
function setupRequirementsListener() {
    const q = query(collection(db, 'requirements'), where('requestedById', '==', auth.currentUser.uid), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
        requirementsList.innerHTML = '';
        if (snapshot.empty) {
            requirementsList.innerHTML = '<p class="text-gray-500 text-center">You have not submitted any requirements yet.</p>';
            return;
        }
        snapshot.forEach(doc => renderRequirementCard(doc.data()));
    }, (error) => {
        console.error("Error fetching requirements:", error);
        requirementsList.innerHTML = '<p class="text-red-500 text-center">Could not load requirements.</p>';
    });
    unsubscribers.push(unsub);
}

function renderRequirementCard(req) {
    const card = document.createElement('div');
    const statusClasses = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
    };
    card.className = 'p-3 border rounded-lg bg-gray-50 flex justify-between items-center';
    card.innerHTML = `
        <div>
            <p class="font-semibold text-gray-800">${req.componentName} (Qty: ${req.quantity})</p>
            <p class="text-sm text-gray-500">For Lab: ${req.labName}</p>
            <p class="text-xs text-gray-400">Reason: ${req.reason}</p>
        </div>
        <span class="text-xs font-bold px-2 py-1 rounded-full ${statusClasses[req.status] || ''}">${req.status.toUpperCase()}</span>
    `;
    requirementsList.appendChild(card);
}

requirementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const [labId, labName] = document.getElementById('reqLabSelect').value.split('|');
    const requirementData = {
        labId: labId,
        labName: labName,
        componentName: document.getElementById('reqComponentName').value,
        quantity: parseInt(document.getElementById('reqQuantity').value),
        reason: document.getElementById('reqReason').value,
        requestedById: auth.currentUser.uid,
        requestedBy: currentUserData.name,
        status: 'pending',
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, 'requirements'), requirementData);
        showMessage('Requirement submitted for approval!', 'success', messageContainerId);
        requirementForm.reset();
    } catch (error) {
        showMessage(`Error submitting requirement: ${error.message}`, 'error', messageContainerId);
    }
});

// --- Complaints Management ---
function setupComplaintsListener() {
    complaintsList.innerHTML = '<p class="text-gray-500 text-center">Loading complaints...</p>';
    if (managedLabIds.length === 0) {
        complaintsList.innerHTML = '<p class="text-gray-500 text-center">You are not assigned to any labs, so there are no complaints to show.</p>';
        return;
    }
    
    let allComplaints = [];
    managedLabIds.forEach(labId => {
        const q = query(collection(db, 'complaints'), where('labId', '==', labId), orderBy('complaintDate', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const complaint = { id: change.doc.id, ...change.doc.data() };
                if (change.type === "added") {
                    if (!allComplaints.find(c => c.id === complaint.id)) allComplaints.push(complaint);
                }
                if (change.type === "modified") {
                    const index = allComplaints.findIndex(c => c.id === complaint.id);
                    if (index > -1) allComplaints[index] = complaint;
                }
                if (change.type === "removed") {
                    allComplaints = allComplaints.filter(c => c.id !== complaint.id);
                }
            });
            renderAllComplaints();
        }, (error) => console.error(`Error fetching complaints for lab ${labId}:`, error));
        unsubscribers.push(unsub);
    });
    
    const renderAllComplaints = () => {
        complaintsList.innerHTML = '';
        if (allComplaints.length === 0) {
            complaintsList.innerHTML = '<p class="text-gray-500 text-center">No complaints found for your labs.</p>';
            return;
        }
        allComplaints.sort((a, b) => b.complaintDate.seconds - a.complaintDate.seconds);
        allComplaints.forEach(c => renderComplaintCard(c));
    };
}

function renderComplaintCard(complaint) {
    const card = document.createElement('div');
    const isNew = complaint.status === 'new';
    const cardBg = isNew ? 'bg-orange-50' : (complaint.status === 'resolved' ? 'bg-green-50' : 'bg-blue-50');

    card.className = `p-4 border rounded-lg ${cardBg}`;
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <p class="font-bold text-gray-800">${complaint.componentName}</p>
                <p class="text-sm text-gray-600"><strong>Lab:</strong> ${complaint.labName}</p>
                <p class="text-sm text-gray-600 mt-2"><strong>Problem:</strong> ${complaint.problemDescription}</p>
                <p class="text-xs text-gray-500 mt-2">Submitted by: ${complaint.studentName}</p>
            </div>
            <div class="text-right">
                <p class="font-semibold text-sm ${isNew ? 'text-orange-600' : 'text-gray-600'}">${complaint.status.toUpperCase()}</p>
                <div class="flex flex-col space-y-2 mt-4">
                    ${isNew ? `<button class="acknowledge-btn bg-blue-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-blue-600">Acknowledge</button>` : ''}
                    ${complaint.status !== 'resolved' ? `<button class="resolve-btn bg-green-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-green-600">Mark as Resolved</button>` : ''}
            </div>
            </div>
        </div>
    `;

    const ackBtn = card.querySelector('.acknowledge-btn');
    if (ackBtn) ackBtn.addEventListener('click', () => updateComplaintStatus(complaint.id, 'acknowledged'));

    const resBtn = card.querySelector('.resolve-btn');
    if (resBtn) resBtn.addEventListener('click', () => updateComplaintStatus(complaint.id, 'resolved'));

    complaintsList.appendChild(card);
}

async function updateComplaintStatus(complaintId, status) {
    try {
        await updateDoc(doc(db, 'complaints', complaintId), { status });
        showMessage(`Complaint marked as ${status}.`, 'success', messageContainerId);
    } catch (error) {
        showMessage(`Error updating complaint: ${error.message}`, 'error', messageContainerId);
    }
}

// --- Modal Logic ---
function closeModal() { modalContainer.innerHTML = ''; }

function openComponentManager(lab) {
    currentSelectedLab = lab;
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center modal z-50">
            <div class="bg-white p-8 rounded-lg shadow-xl max-w-3xl w-full relative h-[80vh] flex flex-col">
                <button id="closeModal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                <h3 class="text-2xl font-bold text-gray-800 mb-6">Component Manager: <span class="text-indigo-600">${lab.name}</span></h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow overflow-hidden">
                    <div class="md:col-span-1"><h4 class="text-lg font-semibold mb-2">Add New Component</h4><form id="addComponentForm" class="space-y-3"><div><label class="text-sm">Name <span class="text-red-500">*</span></label><input type="text" id="compName" required class="w-full p-2 border rounded"></div><div><label class="text-sm">Quantity <span class="text-red-500">*</span></label><input type="number" id="compQty" min="1" required class="w-full p-2 border rounded"></div><div><label class="text-sm">Description</label><textarea id="compDesc" rows="3" class="w-full p-2 border rounded"></textarea></div><button type="submit" class="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Add Component</button></form></div>
                    <div class="md:col-span-2 overflow-y-auto"><h4 class="text-lg font-semibold mb-2">Existing Components</h4><div id="componentList" class="space-y-2"></div></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('addComponentForm').addEventListener('submit', addComponent);
    
    const componentListEl = document.getElementById('componentList');
    const q = query(collection(db, 'labs', lab.id, 'components'), orderBy('name'));
    const unsub = onSnapshot(q, (snapshot) => {
        componentListEl.innerHTML = '';
        if (snapshot.empty) componentListEl.innerHTML = '<p class="text-sm text-gray-500">No components added yet.</p>';
        snapshot.forEach(doc => {
            const comp = doc.data();
            componentListEl.innerHTML += `<div class="p-2 border rounded bg-gray-50 text-sm"><strong>${comp.name}</strong> (Qty: ${comp.quantity})</div>`;
        });
    });
    unsubscribers.push(unsub);
}

async function addComponent(e) {
    e.preventDefault();
    const component = {
        name: document.getElementById('compName').value,
        quantity: parseInt(document.getElementById('compQty').value),
        description: document.getElementById('compDesc').value
    };
    try {
        await addDoc(collection(db, 'labs', currentSelectedLab.id, 'components'), component);
        showMessage('Component added successfully!', 'success', messageContainerId);
        e.target.reset();
    } catch (error) { showMessage(`Error: ${error.message}`, 'error', messageContainerId); }
}

function openAccessKeyPrompt(lab) {
    currentSelectedLab = lab;
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center modal z-50">
            <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full relative">
                <button id="closeModal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                <h3 class="text-xl font-bold text-gray-800 mb-4">Access Required</h3>
                <p class="text-sm text-gray-600 mb-6">Enter the access key for "${lab.name}" to view registers.</p>
                <form id="accessKeyForm"><input type="password" id="accessKeyInput" required class="w-full p-2 border rounded" placeholder="Enter Access Key"><button type="submit" class="w-full mt-4 py-2 px-4 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800">Verify</button></form>
            </div>
        </div>
    `;
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('accessKeyForm').addEventListener('submit', verifyAccessKey);
}

function verifyAccessKey(e) {
    e.preventDefault();
    const enteredKey = document.getElementById('accessKeyInput').value;
    if (enteredKey === currentSelectedLab.accessKey) {
        openRegistersModal(currentSelectedLab);
    } else {
        showMessage('Incorrect Access Key.', 'error', messageContainerId);
    }
}

function openRegistersModal(lab) {
    closeModal(); // Close the access key prompt first
    modalContainer.innerHTML = `
         <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center modal z-50">
            <div class="bg-white p-8 rounded-lg shadow-xl max-w-md w-full relative">
                <button id="closeModal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                <h3 class="text-xl font-bold text-gray-800 mb-4">Registers for <span class="text-indigo-600">${lab.name}</span></h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                        <button class="reg-nav-btn bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600" data-page="deadstock_register" data-collection="deadStockRegister">Dead Stock</button>
                    <button class="reg-nav-btn bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600" data-page="issue_register" data-collection="issueRegister">Issue</button>
                    <button class="reg-nav-btn bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600" data-page="Consumable_register" data-collection="consumableRegister">Consumable</button>
                    <button class="reg-nav-btn bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600" data-page="maintenance_register" data-collection="maintenanceRegister">Maintenance</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.querySelectorAll('.reg-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Passing the page name and the actual database collection name for flexibility
            window.location.href = `${btn.dataset.page}.html?labId=${lab.id}&dashboard=incharge_dashboard&collection=${btn.dataset.collection}`;
        });
    });
}

// --- Logout ---
logoutButton.addEventListener('click', async () => {
    unsubscribers.forEach(unsub => unsub());
    await signOut(auth);
    window.location.href = 'login.html';
});