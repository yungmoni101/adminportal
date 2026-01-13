// Simplified Supabase client for testing
window.supabase = {
    createClient: function(url, key) {
        if (!url || !key) {
            throw new Error('URL and key are required');
        }

        // Helper functions for validation
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function isStrongPassword(password) {
            return password.length >= 8;
        }

        function isAdult(dateOfBirth) {
            if (!dateOfBirth) return false;
            const today = new Date();
            const birthDate = new Date(dateOfBirth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 18;
        }
        
        return {
            url: url,
            key: key,
            
            auth: {
                onAuthStateChange: function(callback) {
                    console.log('Auth state change listener registered');
                    if (typeof callback === 'function') {
                        callback('SIGNED_OUT', null);
                    }
                },
                
                signUp: async function({ email, password, options }) {
                    console.log('Simulated sign up for:', email);

                    // Validate email
                    if (!isValidEmail(email)) {
                        return {
                            data: null,
                            error: { message: 'Invalid email format' }
                        };
                    }

                    // Validate password
                    if (!isStrongPassword(password)) {
                        return {
                            data: null,
                            error: { message: 'Password must be at least 8 characters long' }
                        };
                    }

                    // Validate age if date_of_birth is provided
                    if (options?.data?.date_of_birth && !isAdult(options.data.date_of_birth)) {
                        return {
                            data: null,
                            error: { message: 'User must be at least 18 years old' }
                        };
                    }

                    return {
                        data: { 
                            user: { 
                                id: 'test-user-id', 
                                email: email,
                                ...options?.data
                            }
                        },
                        error: null
                    };
                },
                
                signIn: async function({ email, password }) {
                    console.log('Simulated sign in for:', email);
                    
                    // Validate email
                    if (!isValidEmail(email)) {
                        return {
                            data: null,
                            error: { message: 'Invalid email format' }
                        };
                    }

                    return {
                        data: { user: { id: 'test-user-id', email: email } },
                        error: null
                    };
                }
            },
            
            from: function(table) {
                return {
                    select: function() {
                        return {
                            eq: function(field, value) {
                                return {
                                    single: async function() {
                                        console.log(`Simulated query on ${table} where ${field} = ${value}`);
                                        return {
                                            data: { id: 'test-id' },
                                            error: null
                                        };
                                    }
                                };
                            }
                        };
                    },
                    insert: async function(data) {
                        console.log(`Simulated insert into ${table}:`, data);
                        return {
                            data: { id: 'test-id', ...data },
                            error: null
                        };
                    },
                    update: async function(data) {
                        console.log(`Simulated update on ${table}:`, data);
                        return {
                            data: { id: 'test-id', ...data },
                            error: null
                        };
                    }
                };
            }
        };
    }
};

console.log('✅ Supabase test client loaded successfully');
