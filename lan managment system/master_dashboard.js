// master_dashboard.js
// This script handles all logic for the Master Admin Dashboard, including all new feature upgrades.

import { app } from './firebase-config.js';
import { showMessage } from './utils.js';

import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, doc, getDoc, addDoc, 
    updateDoc, deleteDoc, query, where, serverTimestamp, orderBy, getDocs, setDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const welcomeMessage = document.getElementById('welcomeMessage');
const logoutButton = document.getElementById('logoutButton');
const messageContainerId = 'message-container';
const modalContainer = document.getElementById('modalContainer');

// Tabs & Sections
const tabs = {
    labs: document.getElementById('labsTab'),
    users: document.getElementById('usersTab'),
    requirements: document.getElementById('requirementsTab'),
    maintenance: document.getElementById('maintenanceTab'),
    // NEW: Component Suggestions Tab
    suggestions: document.getElementById('suggestionsTab')
};
const sections = {
    labs: document.getElementById('labsSection'),
    users: document.getElementById('usersSection'),
    requirements: document.getElementById('requirementsSection'),
    maintenance: document.getElementById('maintenanceSection'),
    // NEW: Component Suggestions Section
    suggestions: document.getElementById('suggestionsSection')
};

// Content Holders
const addLabForm = document.getElementById('addLabForm');
const labsList = document.getElementById('labsList');
const usersList = document.getElementById('usersList');
const userRoleFilter = document.getElementById('userRoleFilter');
const requirementsList = document.getElementById('requirementsList');
const maintenanceList = document.getElementById('maintenanceList');
const addUserBtn = document.getElementById('addUserBtn');
// NEW: Suggestion List Holder
const suggestionsList = document.getElementById('suggestionsList');

// --- State ---
let unsubscribers = [];
let labAssistants = [];
let labIncharges = [];
let allUsers = [];

// --- AUTHENTICATION & INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'master' && userDoc.data().approved) {
            welcomeMessage.textContent = `Welcome, ${userDoc.data().name || user.email}!`;
            await fetchPersonnel();
            populateAddLabForm();
            showSection('labs');
        } else {
            await signOut(auth);
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
});

// --- UI & SECTION MANAGEMENT ---
function showSection(sectionName) {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    Object.keys(sections).forEach(key => {
        sections[key].classList.toggle('hidden', key !== sectionName);
        tabs[key].classList.toggle('active', key === sectionName);
    });

    switch(sectionName) {
        case 'labs': setupLabsListener(); break;
        case 'users': setupUserListeners(); break;
        case 'requirements': setupRequirementsListener(); break;
        case 'maintenance': setupMaintenanceListener(); break;
        // NEW: Setup listener for suggestions
        case 'suggestions': setupSuggestionsListener(); break;
    }
}

Object.keys(tabs).forEach(key => {
    tabs[key].addEventListener('click', (e) => { e.preventDefault(); showSection(key); });
});

// --- LAB MANAGEMENT ---

async function fetchPersonnel() {
    try {
        const assistantsQuery = query(collection(db, 'users'), where('role', '==', 'assistant'));
        const inchargesQuery = query(collection(db, 'users'), where('role', '==', 'incharge'));
        
        const [assistantsSnapshot, inchargesSnapshot] = await Promise.all([
            getDocs(assistantsQuery),
            getDocs(inchargesQuery)
        ]);
        
        labAssistants = assistantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        labIncharges = inchargesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Error fetching personnel:", error);
        showMessage('Could not load lab personnel. Check Firestore rules.', 'error', messageContainerId);
    }
}

function populateAddLabForm() {
    addLabForm.innerHTML = `
        <div class="space-y-4">
            <div>
                <label for="labName" class="block text-sm font-medium text-gray-700">Lab Name <span class="text-red-500">*</span></label>
                <input type="text" id="labName" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="labRoomNo" class="block text-sm font-medium text-gray-700">Room No <span class="text-red-500">*</span></label>
                <input type="text" id="labRoomNo" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="labAccessKey" class="block text-sm font-medium text-gray-700">Access Key <span class="text-red-500">*</span></label>
                <input type="text" id="labAccessKey" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
            </div>
            <div>
                <label for="labDescription" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="labDescription" rows="2" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
            </div>
             <div>
                <label for="labIncharge" class="block text-sm font-medium text-gray-700">Assign Incharge <span class="text-red-500">*</span></label>
                <select id="labIncharge" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                    <option value="">Select an Incharge</option>
                    ${labIncharges.map(i => `<option value="${i.id}|${i.email}|${i.name}">${i.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="labAssistant" class="block text-sm font-medium text-gray-700">Assign Assistant <span class="text-red-500">*</span></label>
                <select id="labAssistant" required class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                    <option value="">Select an Assistant</option>
                    ${labAssistants.map(a => `<option value="${a.id}|${a.email}|${a.name}">${a.name}</option>`).join('')}
                </select>
            </div>
            <div class="pt-2">
                <button type="submit" class="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">Add Lab</button>
            </div>
        </div>
    `;
    addLabForm.onsubmit = async (e) => {
        e.preventDefault();
        const selectedIncharge = document.getElementById('labIncharge').value.split('|');
        const selectedAssistant = document.getElementById('labAssistant').value.split('|');
        const labData = {
            name: document.getElementById('labName').value,
            roomNo: document.getElementById('labRoomNo').value,
            accessKey: document.getElementById('labAccessKey').value,
            description: document.getElementById('labDescription').value,
            inchargeId: selectedIncharge[0],
            inchargeEmail: selectedIncharge[1],
            inchargeName: selectedIncharge[2],
            assistantId: selectedAssistant[0],
            assistantEmail: selectedAssistant[1],
            assistantName: selectedAssistant[2],
            createdAt: serverTimestamp()
        };
        if (!labData.name || !labData.roomNo || !labData.accessKey || !labData.inchargeId || !labData.assistantId) {
            showMessage('Please fill all required lab fields.', 'error', messageContainerId);
            return;
        }
        try {
            await addDoc(collection(db, 'labs'), labData);
            showMessage('Lab added successfully!', 'success', messageContainerId);
            addLabForm.reset();
        } catch (error) { showMessage(`Error: ${error.message}`, 'error', messageContainerId); }
    };
}

function setupLabsListener() {
    const q = query(collection(db, 'labs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
        labsList.innerHTML = '';
        if (snapshot.empty) labsList.innerHTML = '<p class="text-gray-500 text-center">No labs created yet.</p>';
        snapshot.forEach(doc => renderLabCard({ id: doc.id, ...doc.data() }));
    });
    unsubscribers.push(unsub);
}

function renderLabCard(lab) {
    const card = document.createElement('div');
    card.className = 'p-4 border rounded-lg bg-gray-50 flex justify-between items-center';
    card.innerHTML = `
        <div>
            <p class="font-bold text-gray-800">${lab.name} (Room: ${lab.roomNo})</p>
            <p class="text-sm text-gray-500">Incharge: ${lab.inchargeName || 'N/A'} | Assistant: ${lab.assistantName || 'N/A'}</p>
        </div>
        <div class="flex space-x-2">
            <button class="edit-btn bg-yellow-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-yellow-600">Edit</button>
            <button class="delete-btn bg-red-500 text-white text-xs font-bold py-1 px-3 rounded hover:bg-red-600">Delete</button>
        </div>
    `;
    card.querySelector('.edit-btn').addEventListener('click', () => openEditModal('lab', lab));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteDocWithConfirm('lab', lab.id, lab.name));
    labsList.appendChild(card);
}

// --- USER MANAGEMENT ---
function setupUserListeners() {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(usersQuery, snapshot => {
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAllUsers();
    }, (error) => {
        showMessage("Failed to load user list. Check Firestore rules.", "error", messageContainerId)
    });

    userRoleFilter.onchange = renderAllUsers;
    unsubscribers.push(unsubUsers);
}

function renderAllUsers() {
    const filter = userRoleFilter.value;
    usersList.innerHTML = '';
    const filteredUsers = allUsers.filter(user => filter === 'all' || user.role === filter);
    
    if (filteredUsers.length === 0) {
        usersList.innerHTML = '<p class="text-gray-500 text-center">No users found.</p>';
        return;
    }
    filteredUsers.forEach(user => renderUserCard(usersList, user));
}

function renderUserCard(list, user) {
    const card = document.createElement('div');
    card.className = 'p-3 border rounded-lg flex justify-between items-center bg-gray-50';
    card.innerHTML = `
        <div>
            <p class="font-semibold text-gray-800 text-sm">${user.name || user.email}</p>
            <p class="text-xs text-gray-500">Role: ${user.role}</p>
        </div>
        <div class="flex space-x-2">
            <button class="edit-user-btn bg-yellow-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-yellow-600">Edit</button>
            <button class="delete-user-btn bg-red-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-600">Delete</button>
        </div>
    `;
    card.querySelector('.edit-user-btn').addEventListener('click', () => openEditModal('user', user));
    card.querySelector('.delete-user-btn').addEventListener('click', () => deleteDocWithConfirm('user', user.id, user.name || user.email));
    list.appendChild(card);
}

addUserBtn.addEventListener('click', () => openEditModal('user', null)); 

// --- REQUIREMENT & MAINTENANCE APPROVALS ---
function setupRequirementsListener() {
    const reqQuery = query(collection(db, 'requirements'), orderBy('timestamp', 'desc'));
    const unsubReq = onSnapshot(reqQuery, (snapshot) => {
        requirementsList.innerHTML = '';
        if (snapshot.empty) {
            requirementsList.innerHTML = '<p class="text-gray-500 text-center">No lab requirements found.</p>';
            return;
        }
        
        const allRequirements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const groupedByLab = allRequirements.reduce((acc, req) => {
            const labName = req.labName || 'Unspecified Lab';
            if (!acc[labName]) acc[labName] = [];
            acc[labName].push(req);
            return acc;
        }, {});

        Object.keys(groupedByLab).sort().forEach(labName => {
            const labGroupEl = document.createElement('div');
            labGroupEl.className = 'mb-6';
            labGroupEl.innerHTML = `<h4 class="text-lg font-bold text-gray-700 mb-2 border-b pb-1">${labName}</h4>`;
            groupedByLab[labName].forEach(req => labGroupEl.appendChild(renderRequirementCard(req)));
            requirementsList.appendChild(labGroupEl);
        });
    }, (error) => { showMessage('Failed to load lab requirements.', 'error', messageContainerId); });
    unsubscribers.push(unsubReq);
}

function renderRequirementCard(req) {
    const card = document.createElement('div');
    const isPending = req.status === 'pending';
    const statusClasses = {
        pending: 'bg-yellow-50 border-yellow-200',
        approved: 'bg-green-50 border-green-200',
        rejected: 'bg-red-50 border-red-200'
    };
    const statusText = {
        pending: 'text-yellow-800',
        approved: 'text-green-800',
        rejected: 'text-red-800'
    };
    card.className = `p-4 border rounded-lg ${statusClasses[req.status] || 'bg-gray-50'}`;
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <p class="font-semibold text-gray-800">${req.componentName} (Qty: ${req.quantity})</p>
                <p class="text-xs text-gray-500 mt-1">By: ${req.requestedBy} | <span class="text-gray-400">${req.timestamp ? new Date(req.timestamp.seconds * 1000).toLocaleDateString() : ''}</span></p>
                ${req.reason ? `<p class="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200"><strong>Reason:</strong> ${req.reason}</p>` : ''}
            </div>
            <div class="text-right">
                ${isPending ? `
                <div class="flex space-x-2 flex-shrink-0">
                    <button class="approve-req-btn bg-green-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-600">Approve</button>
                    <button class="reject-req-btn bg-red-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-600">Reject</button>
                </div>` : `
                <p class="text-sm font-bold ${statusText[req.status]}">${req.status.toUpperCase()}</p>
                `}
            </div>
        </div>
    `;
    if(isPending){
        card.querySelector('.approve-req-btn').addEventListener('click', () => updateRequirementStatus(req.id, 'approved'));
        card.querySelector('.reject-req-btn').addEventListener('click', () => updateRequirementStatus(req.id, 'rejected'));
    }

    return card;
}

async function updateRequirementStatus(reqId, status) {
    try {
        await updateDoc(doc(db, 'requirements', reqId), { status });
        showMessage(`Requirement has been ${status}.`, 'success', messageContainerId);
    } catch(error) {
        showMessage(`Error updating requirement: ${error.message}`, 'error', messageContainerId);
    }
}

function setupMaintenanceListener() {
    const maintQuery = query(collection(db, 'maintenanceRequests'), orderBy('timestamp', 'desc'));
    const unsubMaint = onSnapshot(maintQuery, (snapshot) => {
        maintenanceList.innerHTML = '';
        if (snapshot.empty) maintenanceList.innerHTML = '<p class="text-gray-500 text-center">No maintenance requests found.</p>';
        snapshot.forEach(doc => renderMaintenanceCard({ id: doc.id, ...doc.data() }));
    });
    unsubscribers.push(unsubMaint);
}

function renderMaintenanceCard(req) {
    const card = document.createElement('div');
    const isPending = req.status === 'pending';
    const cardBg = isPending ? 'bg-yellow-50' : (req.status === 'approved' ? 'bg-green-50' : 'bg-red-50');

    card.className = `p-4 border rounded-lg ${cardBg}`;
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <p class="font-bold text-gray-800">${req.instrumentName}</p>
                <p class="text-sm text-gray-600">Lab: <span class="font-semibold">${req.labName}</span> | Fault: ${req.faultType}</p>
                <p class="text-xs text-gray-400 mt-2">Submitted by: ${req.submittedBy}</p>
            </div>
            ${isPending ? `
            <div class="flex space-x-2 flex-shrink-0">
                <button class="approve-btn bg-green-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-600">Approve</button>
                <button class="reject-btn bg-red-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-600">Reject</button>
            </div>` : `
            <div class="text-right">
                <p class="text-sm font-bold ${req.status === 'approved' ? 'text-green-800' : 'text-red-800'}">${req.status.toUpperCase()}</p>
            </div>
            `}
        </div>
    `;
    if (isPending) {
        card.querySelector('.approve-btn').addEventListener('click', () => handleMaintenanceApproval(req, true));
        card.querySelector('.reject-btn').addEventListener('click', () => handleMaintenanceApproval(req, false));
    }
    maintenanceList.appendChild(card);
}

async function handleMaintenanceApproval(requestData, isApproved) {
    const batch = writeBatch(db);
    const requestRef = doc(db, 'maintenanceRequests', requestData.id);

    if (isApproved) {
        // Create a clean log entry, excluding redundant data
        const logEntry = {
            instrumentName: requestData.instrumentName,
            faultType: requestData.faultType,
            dateOfFailure: requestData.dateOfFailure,
            dateOfRepair: requestData.dateOfRepair,
            costOfRepair: requestData.costOfRepair,
            remarks: requestData.remarks,
            approvedBy: auth.currentUser.email,
            timestamp: serverTimestamp() // Use a new server timestamp for the log
        };
        
        const newLogRef = doc(collection(db, 'labs', requestData.labId, 'maintenanceRegister'));
        batch.set(newLogRef, logEntry);
        batch.update(requestRef, { status: 'approved' });
        try {
            await batch.commit();
            showMessage('Maintenance entry approved and logged.', 'success', messageContainerId);
        } catch (error) { showMessage(`Approval failed: ${error.message}`, 'error', messageContainerId); }
    } else {
        try {
            await updateDoc(requestRef, { status: 'rejected' });
            showMessage('Maintenance request rejected.', 'success', messageContainerId);
        } catch (error) { showMessage(`Rejection failed: ${error.message}`, 'error', messageContainerId); }
    }
}


// --- NEW COMPONENT SUGGESTIONS LOGIC ---

function setupSuggestionsListener() {
    const suggestionsQuery = query(collection(db, 'componentSuggestions'), orderBy('suggestionDate', 'desc'));
    const unsubSuggestions = onSnapshot(suggestionsQuery, (snapshot) => {
        suggestionsList.innerHTML = '';
        if (snapshot.empty) {
            suggestionsList.innerHTML = '<p class="text-gray-500 text-center">No new component suggestions found.</p>';
            return;
        }
        snapshot.forEach(doc => renderSuggestionCard({ id: doc.id, ...doc.data() }));
    }, (error) => { showMessage('Failed to load component suggestions.', 'error', messageContainerId); });
    unsubscribers.push(unsubSuggestions);
}

function renderSuggestionCard(suggestion) {
    const card = document.createElement('div');
    const isPending = suggestion.status === 'pending';
    const statusClasses = {
        pending: 'bg-blue-50 border-blue-200', // Using blue for suggestions to differentiate
        approved: 'bg-green-50 border-green-200',
        rejected: 'bg-red-50 border-red-200'
    };
    const statusText = {
        pending: 'text-blue-800',
        approved: 'text-green-800',
        rejected: 'text-red-800'
    };
    
    // Format Price
    const formattedPrice = suggestion.approxPrice 
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(suggestion.approxPrice)
        : 'N/A';

    card.className = `p-4 border rounded-lg ${statusClasses[suggestion.status] || 'bg-gray-50'}`;
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <p class="font-bold text-gray-800">${suggestion.componentName} (Qty: ${suggestion.quantity})</p>
                <p class="text-sm text-gray-600 mt-1">
                    <span class="font-semibold">${suggestion.companyName || 'Generic'}</span> | Est. Price: ${formattedPrice}
                </p>
                <p class="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                    Suggested by: ${suggestion.studentName} | Date: ${suggestion.suggestionDate ? new Date(suggestion.suggestionDate.seconds * 1000).toLocaleDateString() : ''}
                </p>
                ${suggestion.reasonForPurchase ? `<p class="text-sm text-gray-700 mt-2"><strong>Reason:</strong> ${suggestion.reasonForPurchase}</p>` : ''}
            </div>
            <div class="text-right flex-shrink-0">
                ${isPending ? `
                <div class="flex space-x-2">
                    <button class="approve-suggestion-btn bg-green-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-700">Approve</button>
                    <button class="reject-suggestion-btn bg-red-600 text-white text-xs font-bold py-1 px-2 rounded hover:bg-red-700">Reject</button>
                </div>` : `
                <p class="text-sm font-bold ${statusText[suggestion.status]}">${suggestion.status.toUpperCase()}</p>
                `}
            </div>
        </div>
    `;

    if(isPending){
        card.querySelector('.approve-suggestion-btn').addEventListener('click', () => updateSuggestionStatus(suggestion.id, 'approved'));
        card.querySelector('.reject-suggestion-btn').addEventListener('click', () => updateSuggestionStatus(suggestion.id, 'rejected'));
    }

    suggestionsList.appendChild(card);
}

async function updateSuggestionStatus(suggestionId, status) {
    try {
        await updateDoc(doc(db, 'componentSuggestions', suggestionId), { 
            status,
            approvedBy: auth.currentUser.email
        });
        showMessage(`Component suggestion has been ${status}.`, 'success', messageContainerId);
    } catch(error) {
        showMessage(`Error updating suggestion: ${error.message}`, 'error', messageContainerId);
    }
}

// --- GENERIC MODAL & DELETE LOGIC ---
function openEditModal(type, data) {
    const isNew = data === null;
    let modalContent = '';

    if (type === 'lab') {
        const lab = data;
        modalContent = `
            <h3 class="text-xl font-bold text-gray-800 mb-6">Edit Lab: ${lab.name}</h3>
            <form id="editForm" class="space-y-4">
                <input type="hidden" id="docId" value="${lab.id}">
                 <div><label class="block text-sm font-medium">Lab Name</label><input type="text" id="editLabName" value="${lab.name}" required class="mt-1 w-full p-2 border rounded-md"></div>
                <div>
                    <label class="block text-sm font-medium">Assign Incharge</label>
                    <select id="editLabIncharge" required class="mt-1 block w-full p-2 border rounded-md bg-white">
                        ${labIncharges.map(i => `<option value="${i.id}|${i.email}|${i.name}" ${lab.inchargeId === i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium">Assign Assistant</label>
                    <select id="editLabAssistant" required class="mt-1 block w-full p-2 border rounded-md bg-white">
                        ${labAssistants.map(a => `<option value="${a.id}|${a.email}|${a.name}" ${lab.assistantId === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
                <div class="flex justify-end pt-4"><button type="submit" class="py-2 px-6 bg-indigo-600 text-white rounded-lg">Save Changes</button></div>
            </form>
        `;
    } else if (type === 'user') {
        const user = data;
        modalContent = `
            <h3 class="text-xl font-bold text-gray-800 mb-6">${isNew ? 'Add New User' : `Edit User`}</h3>
            <p class="text-sm text-gray-500 -mt-4 mb-4">${isNew ? 'Create a new account.' : user.name || user.email}</p>
            <form id="editForm" class="space-y-4">
                ${isNew ? `
                <input type="hidden" id="docId" value="">
                 <div><label class="block text-sm font-medium">Full Name</label><input type="text" id="editUserName" required class="mt-1 w-full p-2 border rounded-md"></div>
                <div><label class="block text-sm font-medium">Email Address</label><input type="email" id="editUserEmail" required class="mt-1 w-full p-2 border rounded-md"></div>
                <div><label class="block text-sm font-medium">Password</label><input type="password" id="editUserPassword" required class="mt-1 w-full p-2 border rounded-md"></div>` 
                : `<input type="hidden" id="docId" value="${user.id}">`}
                <div>
                    <label class="block text-sm font-medium">Role</label>
                    <select id="editUserRole" required class="mt-1 block w-full p-2 border rounded-md bg-white">
                        <option value="student" ${user?.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="assistant" ${user?.role === 'assistant' ? 'selected' : ''}>Assistant</option>
                        <option value="incharge" ${user?.role === 'incharge' ? 'selected' : ''}>Incharge</option>
                        <option value="master" ${user?.role === 'master' ? 'selected' : ''}>Master Admin</option>
                    </select>
                </div>
                <div class="flex justify-end pt-4">
                    <button type="submit" class="py-2 px-6 bg-indigo-600 text-white rounded-lg">${isNew ? 'Create User' : 'Save Changes'}</button>
                </div>
            </form>
        `;
    }

    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center modal z-50">
            <div class="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full relative">
                <button id="closeModal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                ${modalContent}
            </div>
        </div>
    `;
    modalContainer.classList.remove('hidden');
    document.getElementById('closeModal').addEventListener('click', () => modalContainer.classList.add('hidden'));
    
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = document.getElementById('docId').value;
        try {
            if (type === 'lab') {
                const selectedIncharge = document.getElementById('editLabIncharge').value.split('|');
                const selectedAssistant = document.getElementById('editLabAssistant').value.split('|');
                const updatedData = {
                    name: document.getElementById('editLabName').value,
                    inchargeId: selectedIncharge[0], inchargeEmail: selectedIncharge[1], inchargeName: selectedIncharge[2],
                    assistantId: selectedAssistant[0], assistantEmail: selectedAssistant[1], assistantName: selectedAssistant[2]
                };
                await updateDoc(doc(db, 'labs', docId), updatedData);
                showMessage('Lab updated!', 'success', messageContainerId);
            } else if (type === 'user') {
                if (isNew) {
                    const email = document.getElementById('editUserEmail').value;
                    const password = document.getElementById('editUserPassword').value;
                    const name = document.getElementById('editUserName').value;
                    const role = document.getElementById('editUserRole').value;
                    
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        name, email, role, approved: true, createdAt: serverTimestamp()
                    });
                    showMessage(`User ${name} created successfully!`, 'success', messageContainerId);

                } else {
                    const updatedData = { role: document.getElementById('editUserRole').value };
                    await updateDoc(doc(db, 'users', docId), updatedData);
                    showMessage('User role updated!', 'success', messageContainerId);
                }
            }
            modalContainer.classList.add('hidden');
        } catch(error) { showMessage(`Error: ${error.message}`, 'error', messageContainerId); }
    });
}

async function deleteDocWithConfirm(type, id, name) {
    // Provide a more specific confirmation message when deleting a user
    const confirmationMessage = type === 'user'
        ? `Are you sure you want to permanently delete the user "${name}"? This will delete their login account and all associated data. This action cannot be undone.`
        : `Are you sure you want to delete ${type}: "${name}"? This cannot be undone.`;

    if (confirm(confirmationMessage)) {
        try {
            // Deleting this document will automatically trigger the backend Cloud Function
            await deleteDoc(doc(db, `${type}s`, id));
            showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`, 'success', messageContainerId);
        } catch (error) { 
            showMessage(`Error deleting ${type}: ${error.message}`, 'error', messageContainerId); 
        }
    }
}

// Logout
logoutButton.addEventListener('click', async () => {
    unsubscribers.forEach(unsub => unsub());
    await signOut(auth);
    window.location.href = 'login.html';
});