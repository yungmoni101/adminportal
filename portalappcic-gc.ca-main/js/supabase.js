// Supabase client initialization
const supabaseUrl = 'https://mukeqzyftswyitizgxii.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11a2VxenlmdHN3eWl0aXpneGlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDQ2OTIwOSwiZXhwIjoyMDYwMDQ1MjA5fQ.qZcMgBZCz86TXjvO7EqfcGneRYs4Zfc6HPWvicLwdNE';

// Initialize the Supabase client
let supabase;

function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase client not available. Make sure the Supabase script is loaded.');
        return false;
    }

    try {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        return false;
    }
}

try {
    initSupabase();
} catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    throw error;
}

// Real-time subscription for user updates
function subscribeToUserUpdates(userId, callback) {
    return supabase
        .from('users')
        .on('*', payload => {
            if (payload.new.id === userId) {
                callback(payload.new);
            }
        })
        .subscribe();
}

// Real-time subscription for application checklist updates
function subscribeToChecklistUpdates(userId, callback) {
    return supabase
        .from('application_checklists')
        .on('*', payload => {
            if (payload.new.user_id === userId) {
                callback(payload.new);
            }
        })
        .subscribe();
}

// User Authentication Functions
async function signUp(firstName, dateOfBirth, countryOfBirth, email, password) {
    try {
        // First check if email already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existingUser) {
            return { 
                error: { 
                    message: 'An account with this email already exists. Please use a different email or try logging in.' 
                } 
            };
        }

        // Create user in the users table first
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([
                {
                    first_name: firstName,
                    date_of_birth: dateOfBirth,
                    country_of_birth: countryOfBirth,
                    email: email,
                    password: password,
                    balance: 0
                }
            ])
            .select()
            .single();

        if (userError) {
            console.error('User creation error:', userError);
            return { error: userError };
        }

        // Then try to create the auth user (but don't fail if email verification fails)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    user_id: userData.id
                },
                emailRedirectTo: window.location.origin + '/index.html'
            }
        });

        // Create initial application checklist
        const { error: checklistError } = await supabase
            .from('application_checklists')
            .insert([
                {
                    user_id: userData.id,
                    eligibility_checked: false,
                    medical_checked: false,
                    document_checked: false,
                    interview_checked: false,
                    proof_of_funds_checked: false
                }
            ]);

        if (checklistError) {
            console.error('Checklist creation error:', checklistError);
            // Clean up if checklist creation fails
            await supabase.from('users').delete().eq('id', userData.id);
            return { error: checklistError };
        }

        // Even if auth has an error, we'll return success but with a warning
        let message = 'Account created successfully!';
        if (authError) {
            console.warn('Auth warning:', authError);
            message = 'Account created successfully, but email verification is currently disabled. You can proceed to login.';
        } else {
            message = `Account created successfully! Please check your email (${email}) to verify your account. The verification link will redirect you to the login page.`;
        }

        return { 
            data: { 
                user: userData,
                auth: authData,
                message: message
            }, 
            error: null 
        };

    } catch (error) {
        console.error('Signup Error:', error);
        return { error };
    }
}

async function signIn(email, password) {
    try {
        // Get the stored application data from session storage
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (!currentUserStr) {
            throw new Error('Please sign in with your application ID first');
        }

        const currentUser = JSON.parse(currentUserStr);
        const { application_id } = currentUser;

        if (!application_id) {
            throw new Error('No application ID found in session. Please start from the application ID page.');
        }

        // First check if this email exists
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (userError) throw userError;

        if (!userData) {
            throw new Error('Invalid email or password');
        }

        // Then verify the password and application ID match
        if (userData.password !== password) {
            throw new Error('Invalid email or password');
        }

        // Compare application IDs case-insensitively
        if (userData.application_id.toLowerCase() !== application_id.toLowerCase()) {
            throw new Error('This account is not associated with the current application');
        }

        // Store user data in session storage
        sessionStorage.setItem('userId', userData.id);
        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userName', userData.first_name);
        sessionStorage.setItem('userBalance', userData.balance);

        return { data: userData };
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Get current user error:', error);
        throw error;
    }
}

async function resetPassword(email) {
    try {
        // Check if user exists in database
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (error) throw error;

        if (!data) {
            throw new Error('No user found');
        }

        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        throw error;
    }
}

// User Profile Functions
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { profile: data, error: null };
    } catch (error) {
        console.error('GetUserProfile error:', error);
        return { profile: null, error };
    }
}

async function updateUserProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { profile: data, error: null };
    } catch (error) {
        console.error('UpdateUserProfile error:', error);
        return { profile: null, error };
    }
}

// Application Checklist Functions
async function getApplicationChecklist(userId) {
    try {
        const { data, error } = await supabase
            .from('application_checklists')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return { checklist: data, error: null };
    } catch (error) {
        console.error('GetApplicationChecklist error:', error);
        return { checklist: null, error };
    }
}

async function updateApplicationChecklist(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('application_checklists')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return { checklist: data, error: null };
    } catch (error) {
        console.error('UpdateApplicationChecklist error:', error);
        return { checklist: null, error };
    }
}

// Balance Management Functions
async function updateBalance(userId, amount, type) {
    try {
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const newBalance = type === 'deposit' 
            ? userData.balance + amount 
            : userData.balance - amount;

        const { data, error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId)
            .select()
            .single();

        if (updateError) throw updateError;
        return { balance: data.balance, error: null };
    } catch (error) {
        console.error('UpdateBalance error:', error);
        return { balance: null, error };
    }
}

// Application functions
async function createApplication(userId, applicationType, destination) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .insert([
                {
                    user_id: userId,
                    application_type: applicationType,
                    destination,
                    application_status: 'Pending'
                }
            ]);
        
        if (error) throw error
        return { application: data[0], error: null }
    } catch (error) {
        return { application: null, error }
    }
}

async function updateApplicationStatus(applicationId, status) {
    try {
        const { data, error } = await supabase
            .from('applications')
            .update({ application_status: status })
            .eq('application_id', applicationId);
        
        if (error) throw error
        return { application: data[0], error: null }
    } catch (error) {
        return { application: null, error }
    }
}

// Deposit functions
async function createDeposit(amount) {
    console.log('Creating deposit with amount:', amount);
    try {
        const userId = sessionStorage.getItem('userId');
        console.log('User ID from session:', userId);

        if (!userId) {
            throw new Error('User ID not found in session');
        }

        const { data: deposit, error: depositError } = await supabase
            .from('deposits')
            .insert([
                {
                    user_id: userId,
                    amount: parseFloat(amount),
                    status: 'Pending',
                    date_time: new Date().toISOString()
                }
            ])
            .select();
        
        if (depositError) {
            console.error('Deposit error:', depositError);
            throw depositError;
        }

        console.log('Deposit created successfully:', deposit);
        return { data: deposit[0], error: null };
    } catch (error) {
        console.error('Create deposit error:', error);
        return { data: null, error };
    }
}

async function updateDepositStatus(depositId, status) {
    try {
        const { data, error } = await supabase
            .from('deposits')
            .update({ status })
            .eq('deposit_id', depositId)
            .select();
        
        if (error) throw error
        return { deposit: data[0], error: null }
    } catch (error) {
        return { deposit: null, error }
    }
}

// Withdrawal functions
async function createWithdrawal(userId, amount) {
    try {
        // Check if user has sufficient balance
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single()

        if (userError) throw userError
        if (parseFloat(userData.balance) < parseFloat(amount)) {
            throw new Error('Insufficient balance')
        }

        const { data: withdrawal, error: withdrawalError } = await supabase
            .from('withdrawals')
            .insert([
                {
                    user_id: userId,
                    amount,
                    status: 'Pending'
                }
            ])
            .select();
        
        if (withdrawalError) throw withdrawalError

        // Update user balance after successful withdrawal
        const newBalance = parseFloat(userData.balance) - parseFloat(amount)
        await updateBalance(userId, newBalance, 'withdrawal')

        return { withdrawal: withdrawal[0], error: null }
    } catch (error) {
        return { withdrawal: null, error }
    }
}

async function updateWithdrawalStatus(withdrawalId, status) {
    try {
        const { data, error } = await supabase
            .from('withdrawals')
            .update({ status })
            .eq('withdrawal_id', withdrawalId)
            .select();
        
        if (error) throw error
        return { withdrawal: data[0], error: null }
    } catch (error) {
        return { withdrawal: null, error }
    }
}

// Checklist functions
async function updateChecklist(userId, checklistData) {
    try {
        const { data, error } = await supabase
            .from('application_checklists')
            .upsert([
                {
                    user_id: userId,
                    ...checklistData
                }
            ])
            .select();
        
        if (error) throw error
        return { checklist: data[0], error: null }
    } catch (error) {
        return { checklist: null, error }
    }
}

// User balance functions
async function updateUserBalance(userId, newBalance) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId)
            .select();
        
        if (error) throw error
        return { user: data[0], error: null }
    } catch (error) {
        return { user: null, error }
    }
}

// Get user data
async function getUserData(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                applications (
                    application_id,
                    application_status,
                    application_type,
                    application_date,
                    destination
                ),
                application_checklists (
                    checklist_id,
                    eligibility_checked,
                    medical_checked,
                    document_checked,
                    interview_checked,
                    proof_of_funds_checked
                ),
                deposits (
                    deposit_id,
                    amount,
                    date_time,
                    status
                ),
                withdrawals (
                    withdrawal_id,
                    amount,
                    date_time,
                    status
                )
            `)
            .eq('id', userId)
            .single();
        
        if (error) throw error
        return { user: data, error: null }
    } catch (error) {
        return { user: null, error }
    }
}

// Application registration function
async function registerApplication(applicationId, firstName, dateOfBirth, countryOfBirth) {
    try {
        // Convert applicationId to integer and validate format
        const numericId = parseInt(applicationId, 10);
        
        if (isNaN(numericId) || numericId.toString() !== applicationId.toString()) {
            return { 
                error: { 
                    message: 'Invalid Application ID. Please enter a valid number without any special characters.' 
                } 
            };
        }

        // First check if application ID exists
        const { data: existingApplication, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('application_id', numericId)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking application:', checkError);
            return { error: checkError };
        }

        if (!existingApplication) {
            return { 
                error: { 
                    message: 'Application ID not found. Please ensure you have entered the correct Application ID.' 
                } 
            };
        }

        // Always update user details to ensure they are set
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                first_name: firstName,
                date_of_birth: dateOfBirth,
                country_of_birth: countryOfBirth,
                registration_date: new Date().toISOString()
            })
            .eq('application_id', numericId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating user:', updateError);
            return { error: updateError };
        }

        // Return success with the updated record
        return { 
            success: true,
            data: updatedUser,
            message: 'Registration successful! Redirecting to your account...',
            redirect: 'application.html'
        };

    } catch (error) {
        console.error('Error in registerApplication:', error);
        return { 
            error: {
                message: 'An unexpected error occurred. Please try again later.'
            }
        };
    }
}

// Application ID sign in function
async function signInWithApplicationId(applicationId) {
    if (!supabase) {
        const initialized = initSupabase();
        if (!initialized) {
            return { error: { message: 'Database connection not available' } };
        }
    }

    try {
        // Query the users table for the application ID
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('application_id', applicationId)
            .single();

        if (error || !user) {
            return { error: { message: 'Please register to continue.' } };
        }

        // Check if user has completed their details
        if (!user.first_name || !user.date_of_birth || !user.country_of_birth) {
            return { 
                error: { 
                    message: 'Please complete your registration.',
                    redirect: 'createaccount.html'
                } 
            };
        }

        // Store user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        
        return { data: user };
    } catch (error) {
        console.error('Error in signInWithApplicationId:', error);
        return { error: { message: 'Please register to continue.' } };
    }
}

// Authentication check function
async function checkApplicationAuth() {
    try {
        const userDataStr = sessionStorage.getItem('currentUser');
        if (!userDataStr) {
            window.location.href = 'index.html';
            return null;
        }

        const userData = JSON.parse(userDataStr);
        if (!userData.application_id) {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return null;
        }

        return userData;
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// Checklist visibility functions
async function getChecklistVisibility(userId) {
    try {
        // First get the user's application ID
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, application_id')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Then get the checklist visibility
        const { data: visibilityData, error: visibilityError } = await supabase
            .from('checklist_visibility')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (visibilityError && visibilityError.code !== 'PGRST116') { // Not found error
            throw visibilityError;
        }

        // If no visibility record exists, create one with default values
        if (!visibilityData) {
            const { data: newVisibility, error: createError } = await supabase
                .from('checklist_visibility')
                .insert([{
                    user_id: userId,
                    eligibility_show: true,
                    medical_show: false,
                    document_show: false,
                    interview_show: false,
                    proof_of_funds_show: false
                }])
                .select()
                .single();

            if (createError) throw createError;
            return newVisibility;
        }

        return visibilityData;
    } catch (error) {
        console.error('Error getting checklist visibility:', error);
        throw error;
    }
}

async function updateChecklistVisibility(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('checklist_visibility')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating checklist visibility:', error);
        throw error;
    }
}

// Export functions
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.resetPassword = resetPassword;
window.getUserProfile = getUserProfile;
window.updateUserProfile = updateUserProfile;
window.getApplicationChecklist = getApplicationChecklist;
window.updateApplicationChecklist = updateApplicationChecklist;
window.updateBalance = updateBalance;
window.createApplication = createApplication;
window.updateApplicationStatus = updateApplicationStatus;
window.createDeposit = createDeposit;
window.updateDepositStatus = updateDepositStatus;
window.createWithdrawal = createWithdrawal;
window.updateWithdrawalStatus = updateWithdrawalStatus;
window.updateChecklist = updateChecklist;
window.updateUserBalance = updateUserBalance;
window.getUserData = getUserData;
window.registerApplication = registerApplication;
window.signInWithApplicationId = signInWithApplicationId;
window.checkApplicationAuth = checkApplicationAuth;
window.getChecklistVisibility = getChecklistVisibility;
window.updateChecklistVisibility = updateChecklistVisibility;
window.supabase = supabase;
