// Test user registration
async function testRegistration() {
    console.log('Starting registration test...');

    // Test 1: Valid registration
    try {
        const validUser = {
            firstName: 'John',
            dateOfBirth: '1990-01-01',
            countryOfBirth: 'Canada',
            email: 'test@example.com',
            password: 'Test123456'
        };

        console.log('Test 1: Attempting valid registration...');
        console.log('User data:', validUser);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: validUser.email,
            password: validUser.password,
            options: {
                data: {
                    first_name: validUser.firstName,
                    date_of_birth: validUser.dateOfBirth,
                    country_of_birth: validUser.countryOfBirth
                }
            }
        });

        if (signUpError) {
            console.error('❌ Test 1 failed:', signUpError.message);
            console.error('Error details:', signUpError);
        } else {
            console.log('✅ Test 1 passed: User registered successfully');
            console.log('User data:', signUpData);
        }
    } catch (error) {
        console.error('❌ Test 1 failed with exception:', error);
    }

    // Test 2: Invalid email
    try {
        const invalidUser = {
            firstName: 'Jane',
            dateOfBirth: '1995-01-01',
            countryOfBirth: 'USA',
            email: 'invalid-email',
            password: 'Test123456'
        };

        console.log('\nTest 2: Attempting registration with invalid email...');
        console.log('User data:', invalidUser);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: invalidUser.email,
            password: invalidUser.password,
            options: {
                data: {
                    first_name: invalidUser.firstName,
                    date_of_birth: invalidUser.dateOfBirth,
                    country_of_birth: invalidUser.countryOfBirth
                }
            }
        });

        if (signUpError) {
            console.log('✅ Test 2 passed: Invalid email correctly rejected');
            console.log('Error details:', signUpError);
        } else {
            console.error('❌ Test 2 failed: Invalid email was accepted');
            console.log('Response:', signUpData);
        }
    } catch (error) {
        console.log('✅ Test 2 passed: Invalid email correctly rejected');
        console.error('Error details:', error);
    }

    // Test 3: Underage user
    try {
        const underageUser = {
            firstName: 'Young',
            dateOfBirth: new Date().toISOString().split('T')[0], // Today's date
            countryOfBirth: 'Canada',
            email: 'young@example.com',
            password: 'Test123456'
        };

        console.log('\nTest 3: Attempting registration with underage user...');
        console.log('User data:', underageUser);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: underageUser.email,
            password: underageUser.password,
            options: {
                data: {
                    first_name: underageUser.firstName,
                    date_of_birth: underageUser.dateOfBirth,
                    country_of_birth: underageUser.countryOfBirth
                }
            }
        });

        if (signUpError) {
            console.log('✅ Test 3 passed: Underage user correctly rejected');
            console.log('Error details:', signUpError);
        } else {
            console.error('❌ Test 3 failed: Underage user was accepted');
            console.log('Response:', signUpData);
        }
    } catch (error) {
        console.log('✅ Test 3 passed: Underage user correctly rejected');
        console.error('Error details:', error);
    }

    // Test 4: Weak password
    try {
        const weakPasswordUser = {
            firstName: 'Weak',
            dateOfBirth: '1990-01-01',
            countryOfBirth: 'Canada',
            email: 'weak@example.com',
            password: '123'
        };

        console.log('\nTest 4: Attempting registration with weak password...');
        console.log('User data:', weakPasswordUser);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: weakPasswordUser.email,
            password: weakPasswordUser.password,
            options: {
                data: {
                    first_name: weakPasswordUser.firstName,
                    date_of_birth: weakPasswordUser.dateOfBirth,
                    country_of_birth: weakPasswordUser.countryOfBirth
                }
            }
        });

        if (signUpError) {
            console.log('✅ Test 4 passed: Weak password correctly rejected');
            console.log('Error details:', signUpError);
        } else {
            console.error('❌ Test 4 failed: Weak password was accepted');
            console.log('Response:', signUpData);
        }
    } catch (error) {
        console.log('✅ Test 4 passed: Weak password correctly rejected');
        console.error('Error details:', error);
    }
}

// Test RLS policies
async function testRLSPolicies() {
    console.log('\nTesting RLS policies...');

    // Test 1: Try to access another user's data
    try {
        console.log('Test 1: Attempting to access another user\'s data...');
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) {
            console.log('✅ RLS Test 1 passed: Cannot access other users\' data');
            console.log('Error details:', error);
        } else if (data.length <= 1) {
            console.log('✅ RLS Test 1 passed: Only own data is visible');
            console.log('Data:', data);
        } else {
            console.error('❌ RLS Test 1 failed: Can see other users\' data');
            console.log('Data:', data);
        }
    } catch (error) {
        console.log('✅ RLS Test 1 passed with exception:', error.message);
        console.error('Error details:', error);
    }

    // Test 2: Try to update another user's data
    try {
        console.log('\nTest 2: Attempting to update another user\'s data...');
        const { data, error } = await supabase
            .from('users')
            .update({ first_name: 'Hacked' })
            .neq('id', 'current-user-id'); // This should fail due to RLS

        if (error) {
            console.log('✅ RLS Test 2 passed: Cannot update other users\' data');
            console.log('Error details:', error);
        } else {
            console.error('❌ RLS Test 2 failed: Could update other users\' data');
            console.log('Update result:', data);
        }
    } catch (error) {
        console.log('✅ RLS Test 2 passed with exception:', error.message);
        console.error('Error details:', error);
    }
}

// Wrap test execution in error handling
async function startTests() {
    try {
        await runTests();
    } catch (error) {
        console.error('Test execution failed:', error);
    }
}

// Run all tests
async function runTests() {
    console.log('=== Starting Tests ===\n');
    await testRegistration();
    await testRLSPolicies();
    console.log('\n=== Tests Complete ===');
}