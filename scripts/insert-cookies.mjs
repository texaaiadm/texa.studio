// Script to insert cookies into Supabase tool_cookies table
// Run with: node insert-cookies.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odivixmsdxjyqeobalzv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaXZpeG1zZHhqeXFlb2JhbHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ2Nzk3MiwiZXhwIjoyMDg1MDQzOTcyfQ.LQV6svthX4imiW_b5-xum0RsdgQuxu8i-L80FmYVp0U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ChatGPT tool ID
const CHATGPT_TOOL_ID = '33845136-c386-4c0c-9826-bd7d9a981c20';

// Simplified essential cookies for ChatGPT
const chatgptCookies = [
    {
        "domain": ".chatgpt.com",
        "name": "__Secure-next-auth.session-token",
        "value": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..o-iupUqI41qSWk6d.eqpxmg49iDuTfpEq8larti8nAyda7pF-GCKnPytwSnGViQB7Wdgskm_pZGMY5mgW9x3Q86yc_1jdK25Iys9HG0uNN6sCfavtaQO718ZOlwZl5U43fLjy5nk1Yt1gcy88TR3tYsiRfGi0JIy5IOyYg_ZKTOizoNTpBUdo3CPXk0M9Ir7MeUJgpXM1xZDz2WfDH19LIHhb5ubbb1fKCCwSh3HPzFRYGzQgX6L3mwZLi9j-4qjflWclo1LIXGH1tCH_o6xQcqR1njiQ0W__CZRiEsDN2G6M3W3oa2TZwBmYDYRyrNtaGfrKAg9jCaDtzcr1wp4qbHkKB_Mb5D8aS7sH0HfJPw46eTt8LRxtI2YDux7vW6osKqTPcyRJfoNnciEWxT9zJOVVdf3-9OeArBgAxAVMeknY1OUkjf5QsG3lkRCNou5wvFspdnguxRua1zqv1OQHxxtVvWS7A_VctumVOTcpCqf9VGfRnZ_Q3aEi-5f_OWuFDYbVOAnMJHCGrQ_XRpWZBxUX2F4VExPHowWRzk4z5_tFZT0H5ekHbKeXjEP4-zlht-L0IezDmAXPwWWZ70kPrkonLuWd-nnIx9X5OVGdiDsIfMhf5xiySWY3dGSjYLURKG4lasOVg-KX_vTc--csrD_nvXc1CepDhrbjnntTmzNEu7z7xt2fEUmo7YIZxKtrlV8uZYcRbnCsPuhgyZCFNdnCMz-c3y8lkv4FApNiF-KsICoI6AdpidXeKIooRg03aGGIJ2xHpAUTb4FedOuaN92hxWbgrvRiJjaVy1-3TauZnF3JZY_CFTSMVAFzoxSweJyY5CN4umktOZVzq4GFsIDhHY-nPc8IIfvUScDEnTuzdIQqd60kmOlriZsQeoEkDegu0De0k4cust2-OoAkf8rKmOL2quxBmgumdYGWIryvaCbhK4ngshPcLDkdi2XNazLcgiGIF4njSZpCDeMtuK3Hp8kKRbbvgH_iblN22G-1p8-YNDGKQwkUiB5PiDEuMAlI86ca6gpSUGcsFpWtDX8bPukTDNyta_DjkEHrV2B9CnlEO6iz9-pfZb6LDYJciJ3ISZ5M2832mlbz0V0xH9uspQQYUFIKKMiOm8emgKVTc6Z0SpuAMpnxSIJrzYNPnM4tVRXko0X7xEu-j4RV0c076Yw1grJnq84CyHjll-QdCZoA1ha2Jet1AM8qRLMhzO8XgpdnspqmE-Fuj8V3apR11q1ZeGHyWsaTJD7mnDcS-nhrytRSXLHIBh2qZQFvjMWxbDNojHQ6jPdaFrrpgeJ24fwgYE4G36t8vh0jQe3rffUi20oEKMENnJP7M310Sv4cU0Z3SfQxSkMfuYe8XotPNBSc17Qn9CDnQFI0MpiCqTIYXKeRK-n6AvIgUwwR9aSvQd_UQmGHtbt7xmm3caHC4awag73_d2ycRxpi3Ug3NFFGChw961Hi6LbyiJ3P-lX3TEcpeZCvpx5SETq6EdVWdJH1ykJ2lcDw4CZ3iGxCBddC9wxYjV7qI-RXaR8R74sBHmGh5oEf2OzvHmEG0V12TgPC-LqALbsKyWsps3JPz1MfruYX13SEqDaf85AHnczmqplUFE52RoxpzmCgvXnoSu0yUx_eX_J7NJnXkb6hL1zp6MFFEowXrI8TLJLVNqsviV_wK1LkKtOi09B0SczMdOlo0TreYevRiQ-xeL3LO9nYDNFqeXfTPJEAwnM-yuNOjQ0pzNfvrr8GwJz8M9sGlpTbFAkSnPlmstaI7Rmk0pLuT88uHT-kM5tdUwcf3SO4q9TBgYhOVaKi4GDArsif46-fiaqYDBSkJ1Mcz0kbcRvk8wXwfiKtWngpZFXlR9Wt5kvyq2Vc9HKrJ4OrIc6xUQlgQ1EqQ-Qcb9slEhZHbEvLTifOQHdU4ssTUuWN_eCVhsFgZMRRsfSGlXCk6IopeYWRKW1mjpy8pDyDBVM2ntgTTv42AQQbz_FQTpEsMUOwUxnb8Wo_FI-VXz4eHz0rUS5mXPmHpGbNsXnKGlrczdCUoMt7jHf9V1tGcPOK5dE_TK_xfQhRHV_K1Y5hdAKiNI_UGMU4wTNl0RVmpv-VpR1NB2JxvX-k8hAq3Pv0c08U7pTrLm1eWsweogO7fN07p4kt0caoc1kMFGY4JrBgLufIK3ag6ZwJ17PiCjFYBbR6Do28rCD4K5xkJjONMihwE2z-eSXB9U5U2wO04mdB9Reqpt15ZDL3P2kpKRo_9-YL56-mTQSGsj_iIuMylq4IQWpW2TDWrjbgIxIhFGO3mG9UkRyXNtsLPOkT5tqeXomjXMnL-crk8C-ArT5vxujFAvs75bXGuT2Np-m8Rk_G2164RIHy4TIiV2GfbmrcFwiTNbq_NSNe3lPQksrmyZOQ9jmXy9NVCOpt0wA61QqIaBM-pm-8B9v0pV07t6YqWXwAiEURGEG5h7FvqzcUcQXAFL7-IT6V-wRt1qNPvtNTrlKfTbfRsWKO7W2iaVUbAbTNiYgBnWr-YSeY4YrM56t36hDtZPp-d-EoH-EU1A_CtAzr3uKhzKv7d4podVu0as-hqTL3spbTSRytUn-7Ahiwmdd9cCTY63SrOgdwdtopBqJbOkJtD2XOZu0ZxEZYNILhasE66JD3aP_k0XNWI4N7dEM66ZvyZhx9FdXwf8MZfCzAyRBx3P2z2Wf5i3Aenf4MD_APoZalPgpQk-Fp3t43s9zQVei87CDoaCTEyFJksNOB9Vkyf5mM40ucyWifZW6gLQ-hbdE1EvylaBUYNUl9vNoTzdfSGd9R8RNPO2D8GQ_yDnfr9Z2LljkoOUwXLspqBXUXRZmOmHIwP5CbnwU_ylUnGfSeSE9Nnwq3fXOe_TeeyUJpCZdDtxXHXdiuDiXAhe2XLKjsyvF-xo7yIj1CpxrSPY0hbwF-PlS8VjYKypwL_oKAm1cNfJuAr4dEK4h9JJBl2lg533aoAPBPQqowO6Tz58AgR_SVWmttIcH1_v99RTRkyHrKFKdCY_dKVe4Ck_JRP_b-NZAXxxjNh7_9KhiixpjXimxVR2hhXBoswEhKJgBO4JL9RwDCKijZANadBaxM19yXGje8W8dt-QE8alTqBuGNrhcY9G14MHO4BIJ0hKnzQSBepaI5ScGECn9CKa1I_0b8XTrmvHbz74PsaXep9SXT_p3oOsmX67pnTeAcs7nxewfxDPjjqWim4azP5Whv4vsanB-xzMQQP2DjEoykZgzpE7ZhVTGHPrKorbEjyEuv6DJehXut4v7zPqIKLR0Ttrba1f3Oe5_83T0B44ccHwvpYVJ13yL4ti2qaHgsxqWgZaGSt2o2C7Tvxv-TZJqkKOoxHO_Ab1b5HsopOPYrskxd90pqCfNJRMhaqYqEOr9keu9yHPQVxIx40mMVUMEwwLJUNFncG9EJAWctgUx_2u-b9lxVXjUxzvU1MQDKAL0Dl9UhDQ7XYLgzfmlNKVvxoxbn46CCeWnZRZtJBSeST65Uu_MFDYWaz0UreW9fL2j8aK2VEKJF7vLFGE4Gx9V-WqIfpyaWUCSDBLo65D1AlbyFp26q14D0zV4EsjeLdAwWVFsqynxITa4LrBvTke0pNtUH9I6PJNswM_2xX0nYBZdlu9hRsL9pQxElwkIWdtQt3stQohqoWqLk0N2PnbFSqZpkS7NaA3Ul_ru6KNdw7J-0KTuTkIK_QS_QOS4.kxU4tn1v69Zr9ucZaTaDtg",
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "expirationDate": 1778429647
    },
    {
        "domain": ".chatgpt.com",
        "name": "oai-did",
        "value": "8a42b754-c960-418d-bafa-d4ffb94e7885",
        "path": "/",
        "secure": false,
        "httpOnly": false,
        "expirationDate": 1798437581
    },
    {
        "domain": ".chatgpt.com",
        "name": "oai-sc",
        "value": "0gAAAAABpigfRg2dkkbS-NyRHlpVSVjgRO9_WH4bAyUFLNZeecyxfv8ApMDQjHdC3_6kdQb3Hixv-39GyvkbbGHHHtjVZdicI05yORQE7eA9vz_UBjH3w0gfQciaFavO3F5lGzRtYdEWKle3e489utfaaSYFuq_KHLNxqud4WZMnDrc0FkaIn5V5W9fuPZRLZGbllwXCHV5EgHDOJl4d2Mol1ZMX4tq3sN1Yhq2Xs0AfqYe9EdjZ9PlU",
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "expirationDate": 1802189649
    },
    {
        "domain": ".chatgpt.com",
        "name": "_puid",
        "value": "user-LighkEqeyRbeRyTlKYEUGd0J:1770653648-16YWXtQpfUFbjmZr%2BfLi3Gkgs3pKN%2BgcZ9lS%2FKXcnog%3D",
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "expirationDate": 1771258448
    }
];

async function main() {
    console.log('🍪 Inserting cookies for ChatGPT...');

    // Check if already exists
    const { data: existing } = await supabase
        .from('tool_cookies')
        .select('id')
        .eq('tool_id', CHATGPT_TOOL_ID);

    if (existing && existing.length > 0) {
        console.log('⚠️ Cookies already exist, updating...');
        const { error } = await supabase
            .from('tool_cookies')
            .update({
                url: 'https://chatgpt.com',
                cookies: chatgptCookies,
                updated_at: new Date().toISOString()
            })
            .eq('tool_id', CHATGPT_TOOL_ID);

        if (error) {
            console.error('❌ Update error:', error);
        } else {
            console.log('✅ Cookies updated successfully!');
        }
    } else {
        console.log('📝 Inserting new cookies record...');
        const { error } = await supabase
            .from('tool_cookies')
            .insert({
                tool_id: CHATGPT_TOOL_ID,
                url: 'https://chatgpt.com',
                cookies: chatgptCookies
            });

        if (error) {
            console.error('❌ Insert error:', error);
        } else {
            console.log('✅ Cookies inserted successfully!');
        }
    }

    // Update tool's api_url
    console.log('🔧 Updating tool api_url...');
    const { error: updateError } = await supabase
        .from('tools')
        .update({
            api_url: 'http://localhost:8788/api/cookies/33845136-c386-4c0c-9826-bd7d9a981c20'
        })
        .eq('id', CHATGPT_TOOL_ID);

    if (updateError) {
        console.error('❌ Tool update error:', updateError);
    } else {
        console.log('✅ Tool api_url updated!');
    }

    // Verify
    const { data: verify } = await supabase
        .from('tool_cookies')
        .select('*')
        .eq('tool_id', CHATGPT_TOOL_ID);

    console.log('📋 Verification:', verify ? `${verify.length} record(s), ${verify[0]?.cookies?.length || 0} cookies` : 'No data');
}

main().catch(console.error);
